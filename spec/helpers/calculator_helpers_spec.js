const CalculatorHelpers = require('../../lib/helpers/calculator_helpers');

describe('CalculatorHelpers', () => {
  it('gets STRAT index from stratification name', () => {
    expect(CalculatorHelpers.getStratIndexFromStratName('STRAT')).toEqual(0);
    expect(CalculatorHelpers.getStratIndexFromStratName('STRAT_1')).toEqual(1);
    expect(CalculatorHelpers.getStratIndexFromStratName('STRAT_123')).toEqual(123);
  });
});
