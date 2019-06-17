import fs = require('fs');

import {formatDuration, formatTime} from '../src/format-result';
import {readFlight} from '../src/read-flight';
import {readTask} from '../src/read-task';
import {
  calculateDayFactors,
  calculateDayResult,
  compareDayResults,
  createInitialDayResult,
  createIntermediateDayResult,
  InitialDayFactors,
  InitialDayResult,
} from '../src/scoring';
import AreaTaskSolver from '../src/task/solver/area-task-solver';
import RacingTaskSolver from '../src/task/solver/racing-task-solver';
import {readFromFile} from '../src/utils/filter';

const Table = require('cli-table3');
const logUpdate = require('log-update');

if (process.argv.length < 3) {
  console.log('Usage: ts-node examples/calc-ranking.ts FOLDER');
  process.exit(1);
}

let folder = process.argv[2];

let task = readTask(`${folder}/task.tsk`);
let filterRows = readFromFile(`${folder}/filter.csv`);

let callsigns: string[] = [];
let flights: any = {};
let solvers: any = {};
let indexes: any = {};

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

fs.readdirSync(folder)
  .filter(filename => (/\.igc$/i).test(filename))
  .forEach(filename => {
    let callsign = filename.match(/^(.{1,3})_/)![1];

    callsigns.push(callsign.toUpperCase());

    flights[callsign.toUpperCase()] = readFlight(`${folder}/${filename}`);
    indexes[callsign.toUpperCase()] = 0;

    solvers[callsign.toUpperCase()] = task.options.isAAT
      ? new AreaTaskSolver(task)
      : new RacingTaskSolver(task);
  });

let times = Object.keys(flights).map(key => flights[key]).map(flight => ({
  min: flight[0].time,
  max: flight[flight.length - 1].time,
}));

let minTime = Math.min(...times.map(it => it.min)) / 1000;
let maxTime = Math.max(...times.map(it => it.max)) / 1000;

let time = minTime;

function tick() {
  callsigns.forEach(callsign => {
    let index = indexes[callsign];
    let flight = flights[callsign];
    let solver = solvers[callsign];

    while (true) {
      let fix = flight[index];
      if (fix && fix.time / 1000 <= time) {
        index++;
        solver.update(fix);
      } else {
        break;
      }
    }

    indexes[callsign] = index;
  });

  let results: InitialDayResult[] = callsigns.map(callsign => {
    let solver = solvers[callsign] as RacingTaskSolver;
    let result = solver.result;

    let landed = indexes[callsign] >= flights[callsign].length;

    let start = result.path[0];
    let startTimestamp = start && result.distance ? start.time : null;

    let filterRow = filterRows.find(row => row.callsign.toUpperCase() === callsign.toUpperCase())!;

    // Competitor’s Handicap, if handicapping is being used; otherwise H=1
    let H = filterRow.handicap / 100;

    let lastFix = flights[callsign][indexes[callsign]];
    let altitude = lastFix ? lastFix.altitude : null;

    let dayResult = (landed || result.completed || task.options.isAAT)
      ? createInitialDayResult(result, initialDayFactors, H)
      : createIntermediateDayResult(result, initialDayFactors, H, task, time);

    return { ...dayResult, landed, filterRow, startTimestamp, altitude };
  });

  let dayFactors = calculateDayFactors(results, initialDayFactors);

  let fullResults = results
    .map(result => calculateDayResult(result, dayFactors))
    .sort(compareDayResults);

  let table = new Table({
    head: ['#', 'WBK', 'Name', 'Plane', 'Start', 'Time', 'Dist', 'Speed', 'Score', 'Alt.'],
    colAligns: ['right', 'left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right'],
    colWidths: [null, null, null, null, 10, 12, 10, 13, 7, 8],
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
      `${!result.landed || !result.completed || result.aat_min_time_exceeded ? ' ' : '*' } ` +
      `${result.T ? formatDuration(result.T) : ''}`,
      result._D ? `${result._D.toFixed(1)} km` : '',
      result._V ? `${result._V.toFixed(2)} km/h` : '',
      result.S,
      result.altitude !== null ? `${result.altitude} m` : '',
    ]);
  });

  let output = `Time: ${formatTime(time * 1000)}\n\n${table.toString()}`;
  logUpdate(output);

  time += 10;

  if (time <= maxTime + 15) {
    setTimeout(tick, 0);
  }
}

setTimeout(tick, 0);
