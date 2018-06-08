import fs = require('fs');

import Table = require('cli-table2');
import {HorizontalTable} from 'cli-table2';

import {formatDuration, formatTime} from '../src/format-result';
import {readFlight} from '../src/read-flight';
import {readTask} from '../src/read-task';
import {
  calculateDayFactors,
  calculateDayResult,
  compareDayResults,
  createInitialDayResult,
  InitialDayFactors,
  InitialDayResult,
} from '../src/scoring';
import RacingTaskSolver from '../src/task/solver/racing-task-solver';
import {readFromFile} from '../src/utils/filter';

const FIXTURES_PATH = `${__dirname}/../fixtures`;

export function generateRacingTest(fixtureName: string, until: string | null = null) {
  describe(`Racing Task "${fixtureName}"`, () => {
    let testName = until ? `result after ${until}` : `final result`;

    test(testName, () => {
      let untilTimestamp = until ? Date.parse(until) : null;

      let task = readTask(`${FIXTURES_PATH}/${fixtureName}/task.tsk`);
      let pilots = readFromFile(`${FIXTURES_PATH}/${fixtureName}/filter.csv`);

      let initialDayFactors: InitialDayFactors = {
        // Task Distance [km]
        // Dt: task.distance / 1000,

        // Minimum Task Time [s]
        // Td: task.options.aatMinTime || 0,

        // Lowest Handicap (H) of all competitors
        Ho: Math.min(...pilots.map(it => it.handicap)) / 100,

        // Minimum Handicapped Distance to validate the Day [km]
        Dm: 100,
      };

      let results: InitialDayResult[] = findFlights(`${FIXTURES_PATH}/${fixtureName}/`)
        .map(({ callsign, flight }) => {
          let solver = new RacingTaskSolver(task);

          let pilot = pilots.find(it => it.callsign === callsign);

          let landed = true, time = 0;
          for (let fix of flight) {
            time = fix.time / 1000;

            if (untilTimestamp !== null && fix.time > untilTimestamp) {
              landed = false;
              break;
            }

            solver.update(fix);
          }

          let result = solver.result;
          let { completed } = result;
          let startTimestamp = result.path[0].time;

          // Competitor’s Handicap, if handicapping is being used; otherwise H=1
          let H = (pilot ? pilot.handicap : 100) / 100;

          // Competitor’s Marking Distance [km]
          let D = (result.distance || 0) / 1000;

          // Finisher’s Marking Time [s]
          let T = result.time;

          let dayResult = createInitialDayResult(completed, D, T, H, initialDayFactors);

          return { ...dayResult, pilot, landed, startTimestamp };
        });

      let dayFactors = calculateDayFactors(results, initialDayFactors);

      let table = new Table({
        head: ['#', 'WBK', 'Name', 'Plane', 'Start', 'Time', 'Dist', 'Speed', 'Score'],
        colAligns: ['right', 'left', 'left', 'left', 'right', 'right', 'right', 'right', 'right'],
        chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
        style: { head: [], border: [] },
      }) as HorizontalTable;

      results
        .map(result => calculateDayResult(result, dayFactors))
        .sort(compareDayResults)
        .forEach((result: any, i) => {
          let { pilot } = result;

          let distance = result.D ? `${result.D.toFixed(1)} km` : '';
          let speed = result.V ? `${(result.V).toFixed(2)} km/h` : '';

          table.push([
            `${result.landed || result.completed ? ' ' : '!'} ${(i + 1)}`,
            pilot.callsign,
            pilot.pilot,
            pilot.type,
            formatTime(result.startTimestamp),
            result.T ? formatDuration(result.T) : '',
            distance,
            speed,
            result.S,
          ]);
        });

      expect(`\n${table.toString()}\n`).toMatchSnapshot();
    });
  });
}

function findFlights(folderPath: string) {
  return fs.readdirSync(folderPath)
    .filter(filename => (/\.igc$/i).test(filename))
    .filter(filename => filename.match(/^(.{1,3})_/))
    .map(filename => {
      let callsign = filename.match(/^(.{1,3})_/)![1];
      let flight = readFlight(`${folderPath}/${filename}`);
      return { filename, callsign, flight };
    });
}
