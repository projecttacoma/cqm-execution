"use strict" ;

var Result = require('../../lib/models/result.js');

describe("A result", function() {
  let connectionInfo = "mongodb://127.0.0.1:27017/js-ecqme-test";
  let result = new Result(connectionInfo);

  it("wraps up result storage to the db, both indidivual and aggregate", function() {
    let dummy_result = new Result(connectionInfo);
    dummy_result.embedded.test_id = '11111';
    dummy_result.embedded.measure_id = '54321';

    expect(result.save()).toBe(true);
  })
});