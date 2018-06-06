import {BBox} from 'cheap-ruler';

import Point from '../src/geo/point';
import GliderTrackerClient from '../src/glidertracker/client';
import {Fix} from '../src/read-flight';
import {readTask} from '../src/read-task';
import RacingTaskSolver from '../src/task/solver/racing-task-solver';
import {readFromFile} from '../src/utils/filter';

const logUpdate = require('log-update');

let now = new Date();
let day = now.getDate();
let month = now.getMonth() + 1;
let date = `${now.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;

let from = Date.parse(`${date}T00:00:00`);
let to = Date.now();

if (process.argv.length < 4) {
  console.log('Usage: ts-node examples/live-scoring.ts TASK_PATH CSV_PATH');
  process.exit(1);
}

let taskPath = process.argv[2];
let task = readTask(taskPath);

if (task.options.isAAT) {
  console.log('AAT tasks are not supported yet');
  process.exit(1);
}

let filterRows = readFromFile(process.argv[3]);

let fixesById = new Map<string, Fix[]>();
for (let filterRow of filterRows) {
  fixesById.set(filterRow.ognID, []);
}

let client = new GliderTrackerClient({ WebSocket: require('ws') });

function connect() {
  client.connect().then(() => {
    client.setView(task.bbox as BBox);

    for (let filterRow of filterRows) {
      client.requestTrack(filterRow.ognID, from, to);
    }
  });
}

connect();

client.onClose = function() {
  console.log('Reconnecting...');
  connect();
};

client.onTrack = function(id, _fixes) {
  let fixes = fixesById.get(id);
  if (fixes) {
    fixes.push(..._fixes.map(fix => ({
      time: fix.time,
      coordinate: [fix.lon, fix.lat] as Point,
      valid: true,
      altitude: fix.alt / 10 * 3,
    })));
  }
};

client.onRecord = function(record) {
  if (!record.data.comment)
    return;

  let match = record.data.comment.match(/id([0-9a-f]{8})/i);
  if (!match)
    return;

  let id = match[1];
  let flarmMapping = filterRows.find(row => row.ognID === id);
  if (!flarmMapping)
    return;

  let fixes = fixesById.get(id);

  let data = record.data;
  if (fixes && data) {
    fixes.push({
      time: Date.parse(data.timestamp),
      coordinate: [parseFloat(data.longitude), parseFloat(data.latitude)],
      valid: true,
      altitude: data.altitude,
    });
  }
};

function compareResults(a: any, b: any) {
  if (a.speed !== undefined && b.speed === undefined) return -1;
  if (a.speed === undefined && b.speed !== undefined) return 1;
  if (a.speed !== undefined && b.speed !== undefined) {
    if (a.speed > b.speed) return -1;
    if (a.speed < b.speed) return 1;
  } else {
    if (a.distance > b.distance) return -1;
    if (a.distance < b.distance) return 1;
  }
  return 0;
}

setInterval(() => {
  let results = filterRows.map(row => {
    let fixes = fixesById.get(row.ognID)!;
    let lastFix = fixes[fixes.length - 1];

    let solver = new RacingTaskSolver(task);
    solver.consume(fixes);
    let result = solver.result;
    result.cn = row.callsign;
    result.altitude = lastFix && lastFix.altitude;
    return result;
  });

  results.sort(compareResults);

  let lines = results.map(result => {
    let distance = result.distance !== undefined ? `${(result.distance / 1000).toFixed(1)} km` : '';
    let altitude = result.altitude !== undefined && result.altitude !== null ? `${result.altitude.toFixed(0)} m` : '';
    let speed = result.speed !== undefined ? `${(result.speed).toFixed(2)} km/h` : '';

    return `${result.cn}\t${speed || altitude}\t${distance}`;
  });

  logUpdate(`${new Date().toISOString()}\n\n${lines.join('\n')}`);
}, 100);
