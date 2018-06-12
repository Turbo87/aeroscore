import fs = require('fs');

import {csvParse} from 'd3-dsv';

export function readFromFile(path: string): Competitor[] {
  let content = fs.readFileSync(path, 'utf8');
  return parse(content);
}

export function parse(content: string): Competitor[] {
  return csvParse(content, row => ({
    ognID: row.ID || '',
    registration: row.CALL || '',
    callsign: row.CN || '',
    type: row.TYPE || '',
    pilot: row.PILOT || '',
    handicap: row.HANDICAP ? parseInt(row.HANDICAP, 10) : 100,
  }));
}

export function readHandicapsFromFile(path: string): { [key: string]: number } {
  let handicaps = Object.create(null);
  readFromFile(path).forEach(({ callsign, handicap }) => {
    if (callsign) {
      handicaps[callsign.toUpperCase()] = handicap;
    }
  });
  return handicaps;
}

interface Competitor {
  ognID: string;
  registration: string;
  callsign: string;
  type: string;
  pilot: string;
  handicap: number;
}
