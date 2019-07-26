import * as assert from 'assert';
import Point from '../../geo/point';
import {Fix} from '../../read-flight';
import Cylinder from '../shapes/cylinder';
import Task from '../task';
import TaskPointTracker from '../task-point-tracker';

/**
 * This class can be used to find the turnpoints in AAT turnpoint areas that
 * result in the largest overall distance.
 *
 * The `TaskPointTracker` class is used to track all valid task starts,
 * all movement inside of the turnpoint areas and the final task finish, once
 * all turnpoint areas have been reached. Inside the turnpoint areas it uses a
 * "convex hull" algorithm to reduce the number of GPS fixes that are potential
 * turnpoints inside the areas.
 *
 * Once the task is first started it will keep track of the best solution until
 * this point in the `_maxDistanceData` property, which is updated inside of
 * the `update()` method. The final and intermediate results are available on
 * the `result` property.
 *
 * The optimal solution is calculated using a directed acyclic graph (DAG).
 * This graph has edges from the center of the start line/cylinder to all
 * potential turnpoints in the first area, from all potential turnpoints in the
 * first area to all in the second area, from all in the second to all in the
 * third and so on. Finally it contains edges from all potential turnpoints of
 * the last turnpoint area to the center of the finish line/cylinder.
 *
 * These edges all contain a `distance` property that tracks the total distance
 * over all previous task legs and the current leg. When we calculate the best
 * solution we iterate over all edges of the last reached area and find the
 * edge with the highest distance including the distance that was flown since
 * the area was reached.
 */
export default class AreaTaskSolver {
  task: Task;

  /**
   * The `TaskPointTracker` tracks task starts, GPS fixes in turnpoint areas
   * and the final task finish.
   */
  private _tracker: TaskPointTracker;

  /**
   * The `lastFix` property tracks the last fix that was passed to the
   * `update()` method and is used to calculate the current task time for
   * intermediate results.
   */
  private _lastFix?: Fix;

  /**
   * The `_maxDistanceData` property is used to track the best intermediate
   * solution as long as the task was not finished yet.
   */
  private bestSolution?: Solution;

  /**
   * The `_map` property holds a mapping from GPS fix to the graph edge with
   * the highest distance that ends at this GPS fix. It is used as a cache
   * to reduce the number of expensive distance calculations that are necessary
   * to find the best solution for the task.
   */
  private _map = new Map<Fix, Edge>();

  constructor(task: Task) {
    this.task = task;
    this._tracker = new TaskPointTracker(task, { trackConvexHull: true });
  }

  /**
   * The `consume()` method can be used to pass multiple GPS fixes to the solver
   * at once. It will call the `update()` method on all of the contained fixes.
   */
  consume(fixes: Fix[]) {
    for (let fix of fixes) {
      this.update(fix);
    }
  }

  /**
   * This `update()` method is the main way to pass new GPS fixes to the solver.
   * It updates the internal structures for keeping track of the best achieved
   * solution.
   */
  update(fix: Fix) {
    this._lastFix = fix;
    this._tracker.update(fix);

    let currentlegIndex = this._tracker.currentLegIndex;
    if (currentlegIndex === null) {
      return;
    }

    // SC3a §6.3.2d (ii)
    //
    // If the competitor has outlanded on the last leg, the Marking Distance is
    // the distance from the Start Point, less the radius of the Start Ring (if
    // used), through each Credited Fix, to the Finish Point, less the distance
    // from the Outlanding Position to the Finish Point. If the achieved
    // distance on the last leg is less than zero, it shall be taken as zero.

    // SC3a §6.3.2d (iii)
    //
    // If the competitor has outlanded on any other leg, the Marking Distance is
    // the distance from the Start Point, less the radius of the Start Ring (if
    // used), through each Credited Fix, to the point of the next Assigned Area
    // which is nearest to the Outlanding Position, less the distance from the
    // Outlanding Position to this nearest point. If the achieved distance of
    // the uncompleted leg is less than zero, it shall be taken as zero.

    let nextArea = this.task.points[currentlegIndex + 1];
    let nextAreaNearestPoint;
    if (currentlegIndex === this.task.legs.length - 1) {
      nextAreaNearestPoint = this.task.finish.shape.center;
    } else {
      let nextAreaLine = nextArea.shape.toGeoJSON().geometry.coordinates[0];
      nextAreaNearestPoint = this.task['_ruler'].pointOnLine(nextAreaLine, fix.coordinate).point;
    }
    let nextAreaDistance = this.task.measureDistance(fix.coordinate, nextAreaNearestPoint);

    if (currentlegIndex === 0) {
      let distance = this.task.measureDistance(this.task.start.shape.center, nextAreaNearestPoint) - nextAreaDistance;
      if (distance > 0) {
        if (!this.bestSolution || distance > this.bestSolution.lastEdge.distance) {
          this.bestSolution = { lastFix: fix, lastEdge: { distance } };
        }
      }

    } else {
      let prevAreaFixes = this._tracker.areaVisits[currentlegIndex - 1]
        .map(visit => visit.fixes)
        .reduce((array, fixes) => array.concat(fixes), []);

      assert(prevAreaFixes.length > 0);

      let max: Edge = { distance: 0 };
      for (let prevAreaFix of prevAreaFixes) {
        let prevAreaEdgeInfo = this._edgeInfo(prevAreaFix, currentlegIndex - 1);
        assert(prevAreaEdgeInfo);

        let nextAreaLegDistance = this.task.measureDistance(prevAreaFix.coordinate, nextAreaNearestPoint);
        let legDistance = Math.max(0, nextAreaLegDistance - nextAreaDistance);

        let distance = prevAreaEdgeInfo.distance + legDistance;
        if (distance > max.distance) {
          max = { distance, prevFix: prevAreaFix };
        }
      }

      assert(max.prevFix);

      if (max.distance > 0) {
        if (!this.bestSolution || max.distance > this.bestSolution.lastEdge.distance) {
          this.bestSolution = { lastFix: fix, lastEdge: { distance: max.distance, prevFix: max.prevFix } };
        }
      }
    }

  }

  /**
   * The `result` property can be accessed to calculate the final and
   * intermediate results.
   *
   * The `completed` property indicates whether the finish was reached. If that
   * is not the case the `time` and `speed` properties should only be used for
   * informational purposes, but not for scoring.
   */
  get result() {
    // SC3a §6.3.2b
    //
    // The task is completed when the Competitor makes a valid Start, passes
    // through each Assigned Area, in the sequence designated by the Organisers,
    // and makes a valid Finish

    // FinishEvent is only added when last TP has been reached which simplifies the check here
    let completed = this._tracker.hasFinish;

    if (completed) {
      // SC3a §6.3.2d (i)
      //
      // For a completed task, the Marking Distance is the distance from the
      // Start Point to the Finish Point via all Credited Fixes, less the radius
      // of the Start Ring (if used) and less the radius of the Finish Ring (if
      // used).

      // find path with largest distance from finish back to a valid start
      let finishEdge = this.__edgeInfo(this.task.finish.shape.center, this.task.legs.length - 1);

      // calculate marking distance
      let distance = finishEdge.distance * 1000;
      if (this.task.finish.shape instanceof Cylinder) {
        distance -= this.task.finish.shape.radius;
      }

      // trace back the path through the edges
      // (essentially converts linked list to array)
      let finishSolution = { lastFix: this._tracker.finish!, lastEdge: finishEdge };
      let path = this.pathForSolution(finishSolution, this._tracker.starts);

      // calculate actual time
      let time = (this._tracker.finish!.time - path[0].time) / 1000;

      // calculate marking time
      let scoringTime = time < this.task.options.aatMinTime
        ? this.task.options.aatMinTime
        : time;

      let aat_min_time_exceeded = time > this.task.options.aatMinTime;

      // calculate marking speed
      let speed = (distance / 1000) / (scoringTime / 3600);

      return {
        aat_min_time_exceeded,
        completed,
        time,
        distance,
        speed,
        path,
      };
    }

    // if we don't have data yet we can't return anything useful
    if (!this.bestSolution) {
      return {
        aat_min_time_exceeded: false,
        completed: false,
        time: undefined,
        distance: undefined,
        speed: undefined,
        path: [],
      };
    }

    // calculate marking distance
    let distance = this.bestSolution.lastEdge.distance * 1000;

    // trace back the path through the edges
    // (essentially converts linked list to array)
    let path = this.pathForSolution(this.bestSolution, this._tracker.starts);

    // calculate current marking time
    let time = (this._lastFix!.time - path[0].time) / 1000;

    let aat_min_time_exceeded = time > this.task.options.aatMinTime;

    // calculate current marking speed
    let speed = (distance / 1000) / (time / 3600);

    return {
      aat_min_time_exceeded,
      completed,
      time,
      distance,
      speed,
      path,
    };
  }

  private pathForSolution(solution: Solution, starts: Fix[]): Fix[] {
    let path = [solution.lastFix];

    let edge = solution.lastEdge;
    while (edge.prevFix) {
      path.push(edge.prevFix);
      edge = this._map.get(edge.prevFix)!;
    }

    let firstAreaFix = path[path.length - 1]!;
    assert(firstAreaFix);

    let start = starts.slice()
      .reverse()
      .find(fix => fix.time < firstAreaFix.time)!;
    assert(start);

    path.push(start);

    path.reverse();

    return path;
  }

  private _edgeInfo(fix: Fix, legIndex: number): Edge {
    let edgeInfo = this._map.get(fix);
    if (!edgeInfo) {
      edgeInfo = this.__edgeInfo(fix.coordinate, legIndex);
      this._map.set(fix, edgeInfo);
    }
    return edgeInfo;
  }

  private __edgeInfo(point: Point, legIndex: number): Edge {
    if (legIndex === 0) {
      let distance = this.task.measureDistance(this.task.start.shape.center, point);
      return { distance };
    }

    let prevAreaFixes = this._tracker.areaVisits[legIndex - 1]
      .map(visit => visit.fixes)
      .reduce((array, fixes) => array.concat(fixes), []);

    assert(prevAreaFixes.length > 0);

    let max: Edge = { distance: 0 };
    for (let prevAreaFix of prevAreaFixes) {
      let prevAreaEdgeInfo = this._edgeInfo(prevAreaFix, legIndex - 1);
      assert(prevAreaEdgeInfo);

      let legDistance = this.task.measureDistance(prevAreaFix.coordinate, point);
      let distance = prevAreaEdgeInfo.distance + legDistance;
      if (distance > max.distance) {
        max = { distance, prevFix: prevAreaFix };
      }
    }

    assert(max.prevFix);
    return max;
  }
}

interface Solution {
  lastFix: Fix;
  lastEdge: Edge;
}

interface Edge {
  prevFix?: Fix;
  distance: number;
}
