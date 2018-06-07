import {Fix} from '../../read-flight';
import Task from '../task';
import TaskPointTracker from '../task-point-tracker';

interface MaxDistanceData {
  distance: number;
  legIndex: number;
  fix: Fix;
}

export default class RacingTaskSolver {
  task: Task;

  private _tracker: TaskPointTracker;

  private _maxDistance: MaxDistanceData | undefined;

  constructor(task: Task) {
    this.task = task;
    this._tracker = new TaskPointTracker(task, { trackConvexHull: false });
  }

  consume(fixes: Fix[]) {
    fixes.forEach(fix => this.update(fix));
  }

  update(fix: Fix) {
    this._tracker.update(fix);

    let legIndex = this._tracker.currentLegIndex;
    if (legIndex === null) {
      return;
    }

    let nextTP = this.task.points[legIndex + 1];

    // SC3a §6.3.1d (ii)
    //
    // If the competitor has outlanded on the last leg, the Marking Distance is
    // the distance from the Start Point, less the radius of the Start Ring (if
    // used), through each Turn Point to the Finish point, less the distance from
    // the Outlanding Position to the Finish Point. If the achieved distance on
    // the last leg is less than zero, it shall be taken as zero.

    // SC3a §6.3.1d (iii)
    //
    // If the competitor has outlanded on any other leg, the Marking Distance
    // is the distance from the Start Point, less the radius of the Start Ring (if
    // used), through each Turn Point achieved plus the distance achieved on
    // the uncompleted leg. The achieved distance of the uncompleted leg is the
    // length of that leg less the distance between the Outlanding Position and
    // the next Turn Point. If the achieved distance of the uncompleted leg is
    // less than zero, it shall be taken as zero.

    let finishedLegs = this.task.legs.slice(0, legIndex);
    let finishedLegsDistance = finishedLegs.reduce((sum, leg) => sum + leg.distance, 0);

    let currentLegDistance = this.task.legs[legIndex].distance -
      this.task.measureDistance(fix.coordinate, nextTP.shape.center) * 1000;

    let maxDistance = finishedLegsDistance + currentLegDistance;
    if (!this._maxDistance || maxDistance > this._maxDistance.distance) {
      this._maxDistance = { distance: maxDistance, legIndex, fix };
    }
  }

  get result(): any {
    // SC3a §6.3.1b
    //
    // The task is completed when the competitor makes a valid Start, achieves
    // each Turn Point in the designated sequence, and makes a valid Finish.

    // FinishEvent is only added when last TP has been reached which simplifies the check here
    let completed = this._tracker.hasFinish;

    // SC3a §6.3.1d (i)
    //
    // For a completed task, the Marking Distance is the Task Distance.

    let distance = completed
      ? this.task.distance
      : this._maxDistance
        ? this._maxDistance.distance
        : 0;

    // SC3a §6.3.1d (iv)
    //
    // For finishers, the Marking Time is the time elapsed between the most
    // favorable valid Start Time and the Finish Time. For non-finishers the
    // Marking Time is undefined.

    let path = this.findBestPath();

    let time = completed ? (path[path.length - 1].time - path[0].time) / 1000 : undefined;

    // SC3a §6.3.1d (v)
    //
    // For finishers, the Marking Speed is the Marking Distance divided by the
    // Marking Time. For non-finishers the Marking Speed is zero.

    let speed = completed ? (distance as number / 1000) / (time as number / 3600) : undefined;

    return {
      path,
      completed,
      time,
      distance,
      speed,
    };
  }

  private findBestPath(): Fix[] {
    for (let i = this._tracker.starts.length - 1; i >= 0; i--) {
      let start = this._tracker.starts[i];
      let path = this.findPathFrom(start, 0);
      if (path) {
        return [start, ...path];
      }
    }

    return [];
  }

  private findPathFrom(fix: Fix, turnpointIndex: number): Fix[] | null {
    if (this._tracker.finish) {
      let finish = this._tracker.finish;

      if (fix.time > finish.time) {
        return null;
      }

      if (turnpointIndex === this.task.points.length - 2) {
        return [finish];
      }

    } else if (this._maxDistance) {
      let maxDistance = this._maxDistance;

      if (fix.time > maxDistance.fix.time) {
        return null;
      }

      if (turnpointIndex === maxDistance.legIndex) {
        return [maxDistance.fix];
      }

    } else {
      return null;
    }

    let areaVisits = this._tracker.areaVisits[turnpointIndex];
    for (let visit of areaVisits) {
      if (visit.enter.time < fix.time) {
        continue;
      }

      let path = this.findPathFrom(visit.enter, turnpointIndex + 1);
      if (path) {
        return [visit.enter, ...path];
      }
    }

    return null;
  }
}
