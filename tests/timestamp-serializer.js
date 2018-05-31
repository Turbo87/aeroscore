module.exports = {
  test(val) {
    return typeof val === 'number' && val > Date.parse('1980-01-01') && val < Date.parse('2050-01-01');
  },

  print(val) {
    let date = new Date(val);
    return date.toISOString();
  },
};
