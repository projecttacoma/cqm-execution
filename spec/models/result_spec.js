const Result = require('../../lib/models/result.js');

describe('A result', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  const result = new Result(connectionInfo);

  it('wraps up result storage to the db, both indidivual and aggregate', () => {
    const dummyResult = new Result(connectionInfo);
    dummyResult.embedded.test_id = '11111';
    dummyResult.embedded.measure_id = '54321';

    expect(result.save()).toBe(true);
  });
});
