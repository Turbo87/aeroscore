import * as turf from '@turf/helpers';

import {analyzeFlight} from '../src/analyze-flight';
import {readFlight} from '../src/read-flight';
import {readTask} from '../src/read-task';
import {taskToGeoJSON} from '../src/task-to-geojson';
import {viewGeoJSON} from './utils/view-geojson';

if (process.argv.length < 4) {
  console.log('Usage: ts-node examples/show-flights.ts TASK_PATH IGC_PATH');
  process.exit(1);
}

let taskPath = process.argv[2];
let task = readTask(taskPath);

let flightPath = process.argv[3];
let flight = readFlight(flightPath);
let result = analyzeFlight(flight, task);

let json = taskToGeoJSON(task);
json.features.push(turf.lineString(flight.map(it => it.coordinate), { color: 'red', opacity: 0.85 }));

viewGeoJSON(json);
