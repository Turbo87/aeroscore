module.exports = {
  test(val) {
    return typeof val === 'number' && !Number.isInteger(val);
  },

  print(val) {
    return val.toPrecision(8);
  },
};
