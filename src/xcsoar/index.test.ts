import fs = require('fs');

import {read} from './';

describe('XCSoar - TaskReader - read()', () => {
  it('reads "2017-07-15-lev" task correctly', () => {
    let xml = fs.readFileSync(`${__dirname}/../../fixtures/2017-07-15-lev.tsk`, 'utf8');
    expect(read(xml)).toMatchSnapshot();
  });

  it('reads "2017-07-17-lev" task correctly', () => {
    let xml = fs.readFileSync(`${__dirname}/../../fixtures/2017-07-17-lev.tsk`, 'utf8');
    expect(read(xml)).toMatchSnapshot();
  });

  it('reads "Zwickau" task correctly', () => {
    let xml = fs.readFileSync(`${__dirname}/../../fixtures/Zwickau-2018/C_S/2018-07-30/task.tsk`, 'utf8');
    expect(read(xml)).toMatchSnapshot();
  });
});
