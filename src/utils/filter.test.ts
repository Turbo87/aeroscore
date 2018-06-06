import * as filter from './filter';

describe('readFromFile()', () => {
  let FIXTURES = [
    '2017-07-15-lev',
    'Bayreuth/2018-05-30/Open',
  ];

  for (let fixture of FIXTURES) {
    it(fixture, () => {
      let result = filter.readFromFile(`${__dirname}/../../fixtures/${fixture}/filter.csv`);
      expect(result).toMatchSnapshot();
    });
  }
});

describe('readHandicapsFromFile()', () => {
  let FIXTURES = [
    '2017-07-15-lev',
    'Bayreuth/2018-05-30/Open',
  ];

  for (let fixture of FIXTURES) {
    it(fixture, () => {
      let result = filter.readHandicapsFromFile(`${__dirname}/../../fixtures/${fixture}/filter.csv`);
      expect(result).toMatchSnapshot();
    });
  }
});
