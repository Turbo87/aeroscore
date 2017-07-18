import * as turf from '@turf/turf';
import * as cheapRuler from "cheap-ruler";

import {Turnpoint} from "../turnpoint";
import {FinishPoint, StartPoint} from "./task-points";
import Cylinder from "./shapes/cylinder";

export default class Task {
  points: Turnpoint[];
  options: TaskOptions;

  start: StartPoint;
  finish: FinishPoint;

  readonly distance: number;

  private readonly _ruler: cheapRuler.CheapRuler;

  constructor(points: Turnpoint[], options: TaskOptions) {
    this.points = points;
    this.options = options;

    this.start = new StartPoint(points[0].shape);
    this.finish = new FinishPoint(points[points.length - 1].shape);

    let center = turf.center(turf.multiPoint(points.map(point => point.shape.center)));
    this._ruler = cheapRuler(center.geometry.coordinates[1]);

    this.distance = this._calcDistance();
  }

  private _calcDistance() {
    // SC3a §6.3.1c
    //
    // The Task Distance is the distance from the Start Point to the Finish Point via
    // all assigned Turn Points, less the radius of the Start Ring (if used) and less
    // the radius of the Finish Ring (if used).

    let distance = this._ruler.lineDistance(this.points.map(point => point.shape.center)) * 1000;

    if (this.start.shape instanceof Cylinder) {
      distance -= this.start.shape.radius;
    }

    if (this.finish.shape instanceof Cylinder) {
      distance -= this.finish.shape.radius;
    }

    return distance;
  }
}

export interface TaskOptions {
  isAAT: boolean,
  aatMinTime: number,
}