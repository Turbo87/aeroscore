module.exports = {
  test(val) {
    return val && val.length === 2 && typeof val[0] === 'number' && typeof val[1] === 'number';
  },

  print(val) {
    return `lon ${val[0].toFixed(7)} lat ${val[1].toFixed(7)}`;
  },
};
