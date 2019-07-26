import bearing from '@turf/bearing';

import {Turnpoint} from '../turnpoint';
import {fraction} from '../utils/angles';
import {Cylinder, Keyhole, Line, Sector} from './shapes';
import Task from './task';

export type JsonTask = JsonAreaTask | JsonRacingTask;
export type JsonTurnpoint = JsonCylinder | JsonLine | JsonKeyhole | JsonSector;

export interface JsonRacingTask {
  type: 'Racing';
  points: JsonTurnpoint[];
}

export interface JsonAreaTask {
  type: 'AAT';
  minTime: number;
  points: JsonTurnpoint[];
}

export interface JsonCylinder {
  type: 'Cylinder';
  lonlat: [number, number];
  radius: number;
}

export interface JsonLine {
  type: 'Line';
  lonlat: [number, number];
  length: number;
}

export interface JsonSector {
  type: 'Sector';
  lonlat: [number, number];
}

export interface JsonKeyhole {
  type: 'Keyhole';
  lonlat: [number, number];
}

export function taskFromJson(input: JsonTask): Task {
  let points = input.points.map((point, i) => {
    let location = point.lonlat;

    if (point.type === 'Cylinder') {
      return new Cylinder(location, point.radius);
    }

    let direction;
    if (i === 0) {
      let locNext = input.points[i + 1].lonlat;
      direction = bearing(location, locNext);

    } else if (i === input.points.length - 1) {
      let locPrev = input.points[i - 1].lonlat;
      direction = bearing(locPrev, location);

    } else {
      let locPrev = input.points[i - 1].lonlat;
      let locNext = input.points[i + 1].lonlat;

      let bearingtoPrev = bearing(location, locPrev);
      let bearingToNext = bearing(location, locNext);

      let bisector = fraction(bearingtoPrev, bearingToNext);

      direction = bisector - 90;
    }

    if (point.type === 'Line') {
      return new Line(location, point.length, direction);
    }

    if (point.type === 'Keyhole') {
      return new Keyhole(location, direction - 90);
    }

    throw new Error(`Unknown zone type: ${point.type}`);
  }).map(oz => new Turnpoint(oz));

  return new Task(points, {
    isAAT: input.type === 'AAT',
    aatMinTime: input.type === 'AAT' ? input.minTime : 0,
  });
}
