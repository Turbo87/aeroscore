import fs = require('fs');

import {formatTime} from '../src/format-result';
import {Fix, readFlight} from '../src/read-flight';
import {TakeoffDetector} from '../src/takeoff-detector';

if (process.argv.length < 3) {
  console.log('Usage: ts-node examples/calc-flight-times.ts FOLDER');
  process.exit(1);
}

let folder = process.argv[2];

let files = fs.readdirSync(folder);

files.filter(filename => (/\.igc$/i).test(filename)).forEach(filename => {
  let callsign = filename.match(/^(.{1,3})_/)![1];
  let flight = readFlight(`${folder}/${filename}`);

  let detector = new TakeoffDetector();

  let takeoff: Fix | undefined, landing: Fix | undefined;
  detector.on('takeoff', (fix: Fix) => (takeoff = takeoff || fix));
  detector.on('landing', (fix: Fix) => (landing = fix));

  flight.forEach(fix => detector.update(fix));

  console.log(`${callsign}: ${takeoff && formatTime(takeoff.time)} - ${landing && formatTime(landing.time)}`);
});
