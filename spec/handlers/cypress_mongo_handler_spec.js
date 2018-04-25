const CypressHandler = require('../../lib/handlers/cypress_mongo_handler');
const IndividualResult = require('cqm-models').IndividualResult;

describe('A Cypress handler for interacting with MongoDB', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  let handler;

  beforeAll(() => {
    handler = new CypressHandler(connectionInfo);
  });

  it('can be initialized, handle and wrap up results for no measures or patients', () => {
    expect(handler.finished).toBe(true);
    handler.start();
    expect(handler.finished).toBe(false);
    handler.finish();
    expect(handler.finished).toBe(true);
  });

  it('handles and wraps up an IndividualResult', () => {
    handler.start();
    const dummyResult = IndividualResult({ IPP: 1, DENOM: 1, NUMER: 0 });
    const dummyMeasure = { _id: '12345' };
    expect(dummyResult.DENOM).toBe(1);
    handler.handleResult(dummyMeasure, { 54321: dummyResult });
    expect(handler.individualResultsByMeasureId['12345']['54321'].DENOM).toBe(1);
    handler.finish();
    expect(handler.finished).toBe(true);
  });

  it('handles an IndividualResult with correlation_id and effective_date options', () => {
    const options = { effective_date: 'myDate', correlation_id: 'myCorrelation' };
    handler.start(options);
    const dummyResult = IndividualResult({ IPP: 1, DENOM: 1, NUMER: 0 });
    const dummyMeasure = { _id: '12345' };
    expect(dummyResult.DENOM).toBe(1);
    handler.handleResult(dummyMeasure, { 54321: dummyResult });
    handler.finish();
    expect(handler.individualResultsByMeasureId['12345']['54321']
      .extended_data.correlation_id).toBe('myCorrelation');
    expect(handler.individualResultsByMeasureId['12345']['54321']
      .extended_data.effective_date).toBe('myDate');
    expect(handler.finished).toBe(true);
  });

  it('handles and wraps up a set of IndividualResults and aggregates properly', () => {
    handler.start();
    const dummyResult = IndividualResult({
      IPP: 1, DENOM: 1, NUMER: 0,
    });
    const dummyResult2 = IndividualResult({
      IPP: 1, DENOM: 2, NUMER: 0, NUMEX: 1,
    });
    const dummyResult3 = IndividualResult({
      IPP: 1, DENOM: 0, NUMER: 0, NUMEX: 1,
    });
    const dummyMeasure = { _id: '12345' };
    const dummyMeasure2 = { _id: '23456' };

    handler.handleResult(dummyMeasure, { 54321: dummyResult, 43210: dummyResult2 });
    handler.handleResult(dummyMeasure2, { 65432: dummyResult3 });

    handler.finish();
    expect(handler.aggregateResultsByMeasureId['12345'].DENOM).toBe(3);
    expect(handler.aggregateResultsByMeasureId['12345'].NUMEX).toBe(1);
    expect(handler.aggregateResultsByMeasureId['23456'].DENOM).toBe(0);
  });
});
