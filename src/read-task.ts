import fs = require('fs');
import Point from './geo/point';
import Task from './task/task';
import {JsonTask, JsonTurnpoint, taskFromJson} from './task/task-from-json';
import {read} from './xcsoar';

export function readTaskFromString(str: string): Task {
  let task = read(str);

  let points: JsonTurnpoint[] = task.points.map(point => {
    let lonlat: Point = [
      point.waypoint.location.longitude,
      point.waypoint.location.latitude,
    ];

    if (point.observation_zone.type === 'Cylinder') {
      return { type: 'Cylinder', lonlat, radius: point.observation_zone.radius! };
    }

    if (point.observation_zone.type === 'Line') {
      return { type: 'Line', lonlat, length: point.observation_zone.length! };
    }

    if (point.observation_zone.type === 'Keyhole') {
      return { type: 'Keyhole', lonlat };
    }

    throw new Error(`Unknown zone type: ${point.observation_zone.type}`);
  });

  let json: JsonTask = task.type === 'AAT'
    ? { type: 'AAT', minTime: task.aat_min_time || 0, points }
    : { type: 'Racing', points };

  return taskFromJson(json);
}

export function readTask(path: string): Task {
  let file = fs.readFileSync(path, 'utf8');
  return readTaskFromString(file);
}
