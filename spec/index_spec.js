const calculatorHelpers = require('../lib/index.js').CalculatorHelpers;
const measureHelpers = require('../lib/index.js').MeasureHelpers;
const resultsHelpers = require('../lib/index.js').ResultsHelpers;
const patientSource = require('../lib/index.js').PatientSource;
const calculator = require('../lib/index.js').Calculator;


describe('Module exports', () => {
  it('can access all exports', () => {
    expect(calculatorHelpers).not.toBeNull();
    expect(measureHelpers).not.toBeNull();
    expect(resultsHelpers).not.toBeNull();
    expect(patientSource).not.toBeNull();
    expect(calculator).not.toBeNull();
  });
});
