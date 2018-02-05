"use strict" ;

var Handler = require('../lib/handler.js');
var Result = require('../lib/models/result.js');

describe("A handler", function() {
  let connectionInfo = "mongodb://127.0.0.1:27017/js-ecqme-test";
  let handler = new Handler(connectionInfo);

  it("can initialize a MongoDB connection", function() {
    expect(handler.start()).toBe(true);
  });

  it("stores and keeps track of calculation results by patient and by measure id", function() {
    let dummy_patient = { id: 12345 };

    let dummy_result = new Result(connectionInfo);
    dummy_result.embedded.test_id = '11111';
    dummy_result.embedded.measure_id = '54321';

    handler.handleResult(dummy_patient, dummy_result);
    expect(handler.calculation_results[12345]['54321'].embedded.test_id).toBe('11111');
  });

  it("wraps up result storage to the db, both indidivual and aggregate", function() {
    let dummy_patient = { id: 12345 };
    let dummy_result = new Result(connectionInfo);
    dummy_result.embedded.test_id = '11111';
    dummy_result.embedded.measure_id = '54321';

    handler.handleResult(dummy_patient, dummy_result);
    
    expect(handler.finish()).toBe(true);
  })
});