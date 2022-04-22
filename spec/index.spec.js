const calculatorHelpers = require('../lib/index').CalculatorHelpers;
const measureHelpers = require('../lib/index').MeasureHelpers;
const resultsHelpers = require('../lib/index').ResultsHelpers;
const patientSource = require('../lib/index').PatientSource;
const calculator = require('../lib/index').Calculator;

describe('Module exports', () => {
  it('can access all exports', () => {
    expect(calculatorHelpers).not.toBeNull();
    expect(measureHelpers).not.toBeNull();
    expect(resultsHelpers).not.toBeNull();
    expect(patientSource).not.toBeNull();
    expect(calculator).not.toBeNull();
  });
});
