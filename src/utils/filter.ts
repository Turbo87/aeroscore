import fs = require('fs');

import {csvParse} from 'd3-dsv';

export function readHandicapsFromFile(path: string) {
  let content = fs.readFileSync(path, 'utf8');
  let lines = csvParse(content);

  let handicaps = Object.create(null);
  lines.forEach(({ CN, HANDICAP }) => {
    if (CN) {
      handicaps[CN] = HANDICAP ? parseInt(HANDICAP, 10) : 100;
    }
  });
  return handicaps;
}
