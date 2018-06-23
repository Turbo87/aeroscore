import fs = require('fs');

import * as assert from 'assert';
import {Fix, readFlight} from '../../read-flight';
import {readTask} from '../../read-task';
import AreaTaskSolver from './area-task-solver';

const FIXTURES_PATH = `${__dirname}/../../../fixtures`;

describe('AreaTaskSolver', () => {
  let FIXTURES = [
    ['2017-07-15-lev', 'P9'],
    ['2017-07-15-lev', 'SW', '2017-07-15T12:00:00Z'],
    ['2017-07-15-lev', 'XN'],
    ['2017-07-15-lev', 'ZG'],
    ['2017-07-15-lev', '1'],
  ];

  for (let [fixture, callsign, ...times] of FIXTURES) {
    describe(`${fixture} - ${callsign}`, () => {
      let flight: Fix[], index = 0, solver: AreaTaskSolver;

      beforeAll(() => {
        let flightsPath = `${FIXTURES_PATH}/${fixture}`;

        let task = readTask(`${FIXTURES_PATH}/${fixture}.tsk`);

        let filename = fs.readdirSync(flightsPath)
          .filter(filename => (/\.igc$/i).test(filename))
          .find(filename => filename.startsWith(`${callsign}_`));

        assert(filename);

        flight = readFlight(`${flightsPath}/${filename}`);
        index = 0;
        solver = new AreaTaskSolver(task);
      });

      for (let time of times) {
        it(time, () => {
          let timestamp = Date.parse(time);

          for (; index < flight.length && flight[index].time <= timestamp; index++) {
            solver.update(flight[index]);
          }

          expect(solver.result).toMatchSnapshot();
        });
      }

      it('final result', () => {
        for (; index < flight.length; index++) {
          solver.update(flight[index]);
        }

        expect(solver.result).toMatchSnapshot();
      });
    });
  }
});
