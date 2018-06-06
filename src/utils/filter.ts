import fs = require('fs');

import {csvParse} from 'd3-dsv';

export function readFromFile(path: string) {
  let content = fs.readFileSync(path, 'utf8');
  return parse(content);
}

export function parse(content: string) {
  return csvParse(content, row => ({
    ognID: row.ID || '',
    registration: row.CALL || '',
    callsign: row.CN || '',
    type: row.TYPE || '',
    handicap: row.HANDICAP ? parseInt(row.HANDICAP, 10) : 100,
  }));
}

export function readHandicapsFromFile(path: string) {
  let handicaps = Object.create(null);
  readFromFile(path).forEach(({ callsign, handicap }) => {
    if (callsign) {
      handicaps[callsign] = handicap;
    }
  });
  return handicaps;
}
