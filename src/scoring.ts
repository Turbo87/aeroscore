import Task from './task/task';

export function calculateDayFactors(results: InitialDayResult[], initial: InitialDayFactors): DayFactors {
  // Highest Handicapped Distance (Dh) of the Day
  let Do = Math.max(...results.map(it => it.Dh));

  // Highest finisher’s Handicapped Speed (Vh) of the Day
  let Vo = Math.max(...results.map(it => it.Vh));

  // Number of competitors who achieve a Handicapped Distance (Dh) of at least Dm
  let n1 = results.filter(it => it.Dh >= initial.Dm).length;

  // Number of finishers exceeding 2/3 of best Handicapped Speed (Vo)
  let n2 = results.filter(it => it.Vh > Vo * (2 / 3)).length;

  // Number of finishers, regardless of speed
  let n3 = results.filter(it => it.completed).length;

  // Number of competitors who achieve a Handicapped Distance (Dh) of at least Dm/2
  let n4 = results.filter(it => it.Dh > initial.Dm / 2).length;

  // Number of competitors having had a competition launch that Day
  let N = results.length;

  // Marking Time (T) of the finisher whose Vh = Vo; In case of a tie, lowest T applies [s]
  let To = Math.min(...results.filter(it => it.Vh === Vo).map(it => it.T));

  // Maximum available Score for the Day, before F and FCR are applied
  let Pm = results.filter(it => it.completed).length > 0
    ? Math.max(0, Math.min(1000, 5 * Do - 250, 400 * (To / 3600) - 200))
    : Math.max(0, Math.min(1000, 5 * Do - 250));

  // Day Factor
  let F = Math.min(1, 1.25 * n1 / N);

  // Completion Ratio Factor
  let FCR = Math.min(1, n1 ? 1.2 * (n2 / n1) + 0.6 : 0);

  // Maximum available Speed Points for the Day, before F and FCR are applied
  let Pvm = (2 / 3) * (n2 / N) * Pm;

  // Maximum available Distance Points for the Day, before F and FCR are applied
  let Pdm = Pm - Pvm;

  return { ...initial, Do, Vo, n1, n2, n3, n4, N, To, Pm, F, FCR, Pvm, Pdm };
}

export function createInitialDayResult(result: any, dayFactors: InitialDayFactors, H: number): InitialDayResult {
  let { completed } = result;
  let { Ho } = dayFactors;

  let D, _D, T, _T, V, _V;

  let _completed = completed;

  // Competitor’s Marking Distance [km]
  // Competitor’s Display Distance [km]
  D = _D = result.distance / 1000;

  // Finisher’s Marking Time [s]
  // Finisher’s Display Time [s]
  T = _T = result.time;

  // Finisher’s Marking Speed. (V = D / T)
  // Finisher’s Display Speed.
  V = _V = completed ? D / (T / 3600) : 0;

  // Competitor’s Handicapped Distance. (Dh = D x Ho / H) [km]
  let Dh = D * (Ho / H) || 0;

  // Finisher’s Handicapped Speed. (Vh = D / T x Ho / H)
  let Vh = V * (Ho / H) || 0;

  let aat_min_time_exceeded = result.aat_min_time_exceeded;

  return { aat_min_time_exceeded, completed, _completed, D, _D, H, Dh, T, _T, V, _V, Vh };
}

export function createIntermediateDayResult(
  result: any, dayFactors: InitialDayFactors, H: number, task: Task, time: number,
): InitialDayResult {

  let { Ho } = dayFactors;

  let D, _D, T, _T, V, _V;

  let start = result.path[0];
  let hasStart = Boolean(start && result.distance);

  let completed = hasStart;
  let _completed = result.completed;

  // Competitor’s Display Distance [km]
  _D = hasStart ? result.distance / 1000 : 0;

  // Finisher’s Display Time [s]
  _T = hasStart ? (time - start.time / 1000) : 0;

  // Finisher’s Marking Speed. (V = D / T)
  // Finisher’s Display Speed.
  V = _V = hasStart ? _D / (_T! / 3600) : 0;

  // Competitor’s Marking Distance [km]
  D = hasStart ? task.distance / 1000 : 0;

  // Finisher’s Marking Time [s]
  T = hasStart ? 3600 * D / V : 0;

  // Competitor’s Handicapped Distance. (Dh = D x Ho / H) [km]
  let Dh = D * (Ho / H);

  // Finisher’s Handicapped Speed. (Vh = D / T x Ho / H)
  let Vh = V * (Ho / H);

  let aat_min_time_exceeded = result.aat_min_time_exceeded;

  return { aat_min_time_exceeded, completed, _completed, D, _D, H, Dh, T, _T, V, _V, Vh };
}

export function calculateDayResult(result: InitialDayResult, dayFactors: DayFactors): DayResult {
  let { Vo, Pvm, Pdm, Do, F, FCR } = dayFactors;

  // Finisher’s Speed points
  let Pv = result.completed && (result.Vh >= (2 / 3) * Vo)
    ? Pvm * (result.Vh - (2 / 3) * Vo) / ((1 / 3) * Vo)
    : 0;

  // Competitor’s Distance Points
  let Pd = result.completed
    ? Pdm
    : Pdm * (Do ? result.Dh / Do : 0);

  // Competitor’s Score for the Day expressed in points
  let S = Math.round(F * FCR * (Pv + Pd));

  return {...result, Pv, Pd, S};
}

export function compareDayResults(a: DayResult, b: DayResult): number {
  let dS = b.S - a.S;
  if (dS !== 0) {
    return dS;
  }

  let dVh = b.Vh - a.Vh;
  if (dVh !== 0) {
    return dVh;
  }

  return b.Dh - a.Dh;
}

export interface InitialDayFactors {
  /** Lowest Handicap (H) of all competitors */
  Ho: number;

  /** Minimum Handicapped Distance to validate the Day [km] */
  Dm: number;
}

export interface DayFactors extends InitialDayFactors {
  /** Highest Handicapped Distance (Dh) of the Day [km] */
  Do: number;

  /** Highest finisher’s Handicapped Speed (Vh) of the Day */
  Vo: number;

  /** Number of competitors who achieve a Handicapped Distance (Dh) of at least Dm */
  n1: number;

  /** Number of finishers exceeding 2/3 of best Handicapped Speed (Vo) */
  n2: number;

  /** Number of finishers, regardless of speed */
  n3: number;

  /** Number of competitors who achieve a Handicapped Distance (Dh) of at least Dm/2 */
  n4: number;

  /** Number of competitors having had a competition launch that Day */
  N: number;

  /** Marking Time (T) of the finisher whose Vh = Vo; In case of a tie, lowest T applies */
  To: number;

  /** Maximum available Score for the Day, before F and FCR are applied */
  Pm: number;

  /** Day Factor */
  F: number;

  /** Completion Ratio Factor */
  FCR: number;

  /** Maximum available Speed Points for the Day, before F and FCR are applied */
  Pvm: number;

  /** Maximum available Distance Points for the Day, before F and FCR are applied */
  Pdm: number;
}

export interface InitialDayResult {
  aat_min_time_exceeded: boolean;
  completed: boolean;
  _completed: boolean;

  /** Competitor’s Marking Distance [km] */
  D: number;

  /** Competitor’s Display Distance [km] */
  _D: number;

  /** Competitor’s Handicap, if handicapping is being used; otherwise H=1 */
  H: number;

  /** Competitor’s Handicapped Distance. (Dh = D x Ho / H) [km] */
  Dh: number;

  /** Finisher’s Marking Time [s] */
  T: number;

  /** Finisher’s Display Time [s] */
  _T: number;

  /** Finisher’s Marking Speed. (V = D / T) */
  V: number;

  /** Finisher’s Display Speed. (V = D / T) */
  _V: number;

  /** Finisher’s Handicapped Speed. (Vh = D / T x Ho / H) */
  Vh: number;
}

export interface DayResult extends InitialDayResult {
  /** Finisher’s Speed points */
  Pv: number;

  /** Competitor’s Distance Points */
  Pd: number;

  /** Competitor’s Score for the Day expressed in points */
  S: number;
}
