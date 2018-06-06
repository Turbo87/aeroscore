import fs = require('fs');

import {formatTime} from '../src/format-result';
import {readFlight} from '../src/read-flight';
import {readTask} from '../src/read-task';
import RacingTaskSolver from '../src/task/solver/racing-task-solver';

const logUpdate = require('log-update');

if (process.argv.length < 3) {
  console.log('Usage: ts-node examples/calc-ranking.ts FOLDER');
  process.exit(1);
}

let folder = process.argv[2];

let task = readTask(`${folder}/task.tsk`);

if (task.options.isAAT) {
  console.log('AAT tasks are not supported yet');
  process.exit(1);
}

let handicaps = readCSV(`${folder}/filter.csv`);

let callsigns: string[] = [];
let flights: any = {};
let solvers: any = {};
let indexes: any = {};

fs.readdirSync(folder)
  .filter(filename => (/\.igc$/i).test(filename))
  .forEach(filename => {
    let callsign = filename.match(/^(.{1,3})_/)![1];

    callsigns.push(callsign.toUpperCase());

    flights[callsign.toUpperCase()] = readFlight(`${folder}/${filename}`);
    solvers[callsign.toUpperCase()] = new RacingTaskSolver(task);
    indexes[callsign.toUpperCase()] = 0;
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

  let results = callsigns.map(callsign => {
    let solver = solvers[callsign] as RacingTaskSolver;
    let result = solver.result;

    let handicap = handicaps[callsign.toUpperCase()];
    let handicapFactor = 100 / handicap;

    let { distance, speed } = result;
    if (distance !== undefined) distance *= handicapFactor;
    if (speed !== undefined) speed *= handicapFactor;

    return { callsign, handicap, result, distance, speed };
  }).sort(compareResults);

  let lines = results.map((result: any) => {
    let distance = result.result.distance !== undefined ? `${(result.result.distance / 1000).toFixed(1)} km` : '';
    let speed = result.result.speed !== undefined ? `${(result.result.speed).toFixed(2)} km/h` : '';

    return `${result.callsign}\t${result.handicap}\t${distance}\t${speed}`;
  });

  let output = `Time: ${formatTime(time * 1000)}\n\n${lines.join('\n')}`;
  logUpdate(output);

  time += 10;

  if (time <= maxTime) {
    setTimeout(tick, 0);
  }
}

setTimeout(tick, 0);

function compareResults(a: any, b: any) {
  if (a.speed !== undefined && b.speed !== undefined)
    return b.speed - a.speed;

  if (a.speed !== undefined && b.speed === undefined)
    return -1;

  if (a.speed === undefined && b.speed !== undefined)
    return 1;

  return b.distance - a.distance;
}

function readCSV(path: string) {
  let lines = fs.readFileSync(path, 'utf8').split('\n');
  lines.shift();

  let handicaps = Object.create(null);
  lines.map(line => line.trim().split(',')).forEach(([id, _, cn, type, handicap]) => {
    if (id) {
      handicaps[cn] = handicap ? parseInt(handicap, 10) : 100;
    }
  });
  return handicaps;
}
