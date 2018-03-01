const Handler = require('../lib/handler.js');
const Result = require('../lib/models/result.js');

describe('A handler', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  const handler = new Handler(connectionInfo);

  it('can initialize a MongoDB connection', () => {
    expect(handler.start()).toBe(true);
  });

  it('stores and keeps track of calculation results by patient and by measure id', () => {
    const dummyPatient = { id: 12345 };

    const dummyResult = new Result(connectionInfo);
    dummyResult.embedded.test_id = '11111';
    dummyResult.embedded.measure_id = '54321';

    handler.handleResult(dummyPatient, dummyResult);
    expect(handler.calculation_results[12345]['54321'].embedded.test_id).toBe('11111');
  });

  it('wraps up result storage to the db, both indidivual and aggregate', () => {
    const dummyPatient = { id: 12345 };
    const dummyResult = new Result(connectionInfo);
    dummyResult.embedded.test_id = '11111';
    dummyResult.embedded.measure_id = '54321';

    handler.handleResult(dummyPatient, dummyResult);
    expect(handler.finish()).toBe(true);
  });
});
