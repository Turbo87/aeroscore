import {readFlight} from '../../read-flight';
import {readTask} from '../../read-task';
import Task from '../task';
import RacingTaskSolver from './racing-task-solver';

const FIXTURES_PATH = `${__dirname}/../../../fixtures`;

describe('RacingTaskSolver', () => {
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

  describe('with "Bayreuth/2018-05-30/Open"', () => {
    let task: Task;
    let solver: RacingTaskSolver;

    beforeEach(() => {
      task = readTask(`${FIXTURES_PATH}/Bayreuth/2018-05-30/Open/task.tsk`);
      solver = new RacingTaskSolver(task);
    });

    it('can selects correct start point for max distance', () => {
      let flight = readFlight(`${FIXTURES_PATH}/Bayreuth/2018-05-30/Open/FU_85uv7ag1.igc`);
      let fixes = flight.filter(it => it.time <= Date.parse('2018-05-30T11:47:36Z'));
      solver.consume(fixes);
      expect(solver.result).toMatchSnapshot();
    });
  });
});
