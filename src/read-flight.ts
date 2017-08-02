import Point from './geo/point';

import fs = require('fs');
import IGCParser = require('igc-parser');

export interface Fix {
  time: number;
  coordinate: Point;
  valid: boolean;
  altitude: number | null;
}

export function readFlightFromString(str: string): Fix[] {
  return IGCParser.parse(str).fixes.map(fix => ({
    time: fix.timestamp,
    coordinate: [fix.longitude, fix.latitude] as Point,
    valid: fix.valid,
    altitude: fix.gpsAltitude,
  }));
}

export function readFlight(path: string): Fix[] {
  return readFlightFromString(fs.readFileSync(path, 'utf8'));
}
