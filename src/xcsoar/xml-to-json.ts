import Point from '../geo/point';
import {JsonTask, JsonTurnpoint} from '../task/task-from-json';
import {read} from './index';

export function xmlToJson(str: string): JsonTask {
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

  return task.type === 'AAT'
    ? { type: 'AAT', minTime: task.aat_min_time || 0, points }
    : { type: 'Racing', points };
}
