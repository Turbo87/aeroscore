import fs = require('fs');

import {readFlight} from '../../read-flight';
import {readTask} from '../../read-task';
import Task from '../task';
import RacingTaskSolver from './racing-task-solver';

const FIXTURES_PATH = `${__dirname}/../../../fixtures`;

const FIXTURES = [
  ['2017-07-17-lev', '2017-lev.csv', null],
  ['2017-07-17-lev', '2017-lev.csv', '2017-07-17T16:39:00Z'],
];

describe('RacingTaskSolver', () => {
  for (let [fixtureName, filterFilename, maxTime] of FIXTURES) {
    let testName = fixtureName!;
    if (maxTime !== null) {
      testName += ` until ${maxTime}`;
    }

    let maxT = Date.parse(maxTime!);

    test(testName, () => {
      let task = readTask(`${FIXTURES_PATH}/${fixtureName}.tsk`);
      let handicaps = readCSV(`${FIXTURES_PATH}/${filterFilename}`);

      let lines = findFlights(`${FIXTURES_PATH}/${fixtureName}/`)
        .map(({ callsign, flight }) => {
          let solver = new RacingTaskSolver(task);
          for (let fix of flight) {
            if (fix.time > maxT) break;

            solver.update(fix);
          }

          let result = solver.result;

          let handicap = handicaps[callsign.toUpperCase()];
          let handicapFactor = 100 / handicap;

          let { distance, speed } = result;
          if (distance !== undefined) distance *= handicapFactor;
          if (speed !== undefined) speed *= handicapFactor;

          return { callsign, handicap, result, distance, speed };
        })
        .sort(compareResults)
        .map((result: any) => {
          let distance = result.result.distance !== undefined ? `${(result.result.distance / 1000).toFixed(1)} km` : '';
          let speed = result.result.speed !== undefined ? `${(result.result.speed).toFixed(2)} km/h` : '';

          return [
            result.callsign,
            result.handicap.toString().padStart(3),
            distance.padStart(8),
            speed.padStart(11),
          ].join('\t  ');
        })
        .join('\n');

      expect(`\n${lines}\n`).toMatchSnapshot();
    });
  }

  describe('with task "2017-07-17-lev.tsk"', () => {
    let task: Task;
    let solver: RacingTaskSolver;

    beforeEach(() => {
      task = readTask(`${FIXTURES_PATH}/2017-07-17-lev.tsk`);
      solver = new RacingTaskSolver(task);
    });

    it('returns a result', () => {
      let flight = readFlight(`${FIXTURES_PATH}/2017-07-17-lev/IGP_77hg7sd1.IGC`);
      solver.consume(flight);
      expect(solver.result).toMatchSnapshot();
    });

    it('returns an intermediate result', () => {
      let flight = readFlight(`${FIXTURES_PATH}/2017-07-17-lev/IGP_77hg7sd1.IGC`);
      let part1 = flight.slice(0, 1500);
      let part2 = flight.slice(1500);
      solver.consume(part1);
      expect(solver.result).toMatchSnapshot();
      solver.consume(part2);
      expect(solver.result).toMatchSnapshot();
    });

    it('can handle outlandings', () => {
      let flight = readFlight(`${FIXTURES_PATH}/2017-07-17-lev/ZG_77hv6ci1.igc`);
      solver.consume(flight);
      expect(solver.result).toMatchSnapshot();
    });
  });
});

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
      handicaps[cn] = parseInt(handicap, 10);
    }
  });
  return handicaps;
}
