import {BBox} from 'cheap-ruler';

import {formatDuration, formatTime} from '../src/format-result';
import Point from '../src/geo/point';
import GliderTrackerClient from '../src/glidertracker/client';
import {Fix} from '../src/read-flight';
import {readTask} from '../src/read-task';
import {
  calculateDayFactors, calculateDayResult,
  compareDayResults,
  createInitialDayResult,
  createIntermediateDayResult,
  InitialDayFactors,
  InitialDayResult,
} from '../src/scoring';
import RacingTaskSolver from '../src/task/solver/racing-task-solver';
import {readFromFile} from '../src/utils/filter';

const Table = require('cli-table3');
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

let initialDayFactors: InitialDayFactors = {
  // Task Distance [km]
  // Dt: task.distance / 1000,

  // Minimum Task Time [s]
  // Td: task.options.aatMinTime || 0,

  // Lowest Handicap (H) of all competitors
  Ho: Math.min(...filterRows.map(it => it.handicap)) / 100,

  // Minimum Handicapped Distance to validate the Day [km]
  Dm: 100,
};

setInterval(() => {
  let results: InitialDayResult[] = filterRows.map(filterRow => {
    let fixes = fixesById.get(filterRow.ognID)!;

    let solver = new RacingTaskSolver(task);
    solver.consume(fixes);

    let lastFix = fixes[fixes.length - 1];
    let altitude = lastFix ? lastFix.altitude : null;

    let result = solver.result;

    let landed = false; // TODO

    let start = result.path[0];
    let startTimestamp = start && result.distance ? start.time : null;

    // Competitor’s Handicap, if handicapping is being used; otherwise H=1
    let H = filterRow.handicap / 100;

    let dayResult = (landed || result.completed)
      ? createInitialDayResult(result, initialDayFactors, H)
      : createIntermediateDayResult(result, initialDayFactors, H, task, Date.now());

    return { ...dayResult, landed, filterRow, startTimestamp, altitude };
  });

  let dayFactors = calculateDayFactors(results, initialDayFactors);

  let fullResults = results
    .map(result => calculateDayResult(result, dayFactors))
    .sort(compareDayResults);

  let table = new Table({
    head: ['#', 'WBK', 'Name', 'Plane', 'Start', 'Time', 'Dist', 'Speed', 'Score', 'Alt.'],
    colAligns: ['right', 'left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right'],
    colWidths: [null, null, null, null, 10, 10, 10, 13, 7, 8],
    chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
  });

  fullResults.forEach((result: any, i) => {
    let { filterRow } = result;

    table.push([
      `${result.landed || result._completed ? ' ' : '!'} ${(i + 1)}`,
      filterRow.callsign,
      filterRow.pilot,
      filterRow.type,
      result.startTimestamp ? formatTime(result.startTimestamp) : '',
      result._T ? formatDuration(result._T) : '',
      result._D ? `${result._D.toFixed(1)} km` : '',
      result._V ? `${result._V.toFixed(2)} km/h` : '',
      result.S,
      result.altitude !== null ? `${result.altitude} m` : '',
    ]);
  });

  logUpdate(`${new Date().toISOString()}\n\n${table.toString()}`);
}, 100);
