import {BBox} from 'cheap-ruler';
import {parse as parseQS} from 'querystring';
import {parse as parseURL} from 'url';

import {formatDuration, formatTime} from '../src/format-result';
import Point from '../src/geo/point';
import GliderTrackerClient from '../src/glidertracker/client';
import {Fix} from '../src/read-flight';
import {readTask, readTaskFromString} from '../src/read-task';
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
import Task from '../src/task/task';
import {Competitor, parse as parseFilter, readFromFile} from '../src/utils/filter';

const { fetch } = require('fetch-ponyfill')();
const Table = require('cli-table3');
const logUpdate = require('log-update');

function parseGliderTrackerURL(url: string): { tsk: string, lst: string } | undefined {
  // e.g. http://glidertracker.org/
  //      #tsk=https://gist.github.com/hsteinhaus/4369987643f0081d49c4458baa8c1422/raw/task
  //      &lst=https://gist.github.com/hsteinhaus/4369987643f0081d49c4458baa8c1422/raw/filter
  let { hash } = parseURL(url);
  if (!hash) return;

  let { tsk, lst } = parseQS(hash.slice(1));
  if (!tsk || !lst) return;

  return { tsk, lst };
}

async function run(argv: string[]) {
  let now = new Date();
  let day = now.getDate();
  let month = now.getMonth() + 1;
  let date = `${now.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;

  let from = Date.parse(`${date}T00:00:00`);
  let to = Date.now();

  let task: Task, filterRows: Competitor[];

  if (argv[2] && argv[2].startsWith('http://glidertracker.org/')) {
    let url = argv[2];
    let urls = parseGliderTrackerURL(url);
    if (!urls) {
      console.log(`Invalid GliderTracker URL: ${url}`);
      return process.exit(1);
    }

    let taskResponse = await fetch(urls.tsk);
    let taskText = await taskResponse.text();
    task = readTaskFromString(taskText);

    let filterResponse = await fetch(urls.lst);
    let filterText = await filterResponse.text();
    filterRows = parseFilter(filterText);

  } else if (argv.length < 4) {
    console.log('Usage: ts-node examples/live-scoring.ts TASK_PATH CSV_PATH');
    return process.exit(1);

  } else {
    task = readTask(argv[2]);
    filterRows = readFromFile(argv[3]);
  }

  let fixesById = new Map<string, Fix[]>();
  for (let filterRow of filterRows) {
    fixesById.set(filterRow.ognID, []);
  }

  let client = new GliderTrackerClient({WebSocket: require('ws')});

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

      let solver = task.options.isAAT
        ? new AreaTaskSolver(task)
        : new RacingTaskSolver(task);

      solver.consume(fixes);

      let lastFix = fixes[fixes.length - 1];
      let altitude = lastFix ? lastFix.altitude : null;

      let result = solver.result;

      let landed = false; // TODO

      let start = result.path[0];
      let startTimestamp = start && result.distance ? start.time : null;

      // Competitor’s Handicap, if handicapping is being used; otherwise H=1
      let H = filterRow.handicap / 100;

      let dayResult = (landed || result.completed || task.options.isAAT)
        ? createInitialDayResult(result, initialDayFactors, H)
        : createIntermediateDayResult(result, initialDayFactors, H, task, Date.now());

      return {...dayResult, landed, filterRow, startTimestamp, altitude};
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
      let {filterRow} = result;

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
        result.altitude !== null ? `${Math.round(result.altitude)} m` : '',
      ]);
    });

    logUpdate(`${new Date().toISOString()}\n\n${table.toString()}`);
  }, 100);
}

run(process.argv);
