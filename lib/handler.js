"use strict" ;

var Result = require('./models/result.js');

module.exports = class Handler {
  /* Initializes cumulative results structure for storage at finish time, and initializes connection to MongoDB
    */

  constructor(connectionInfo) {
    this.mongoose = require('mongoose');
    this.connectionInfo = connectionInfo;

    /* Individual patient results, hashed by patient_id */
    this.calculation_results = {};
    /* Aggregate patient results, calculated at finish */
    this.aggregate_result = new Result(connectionInfo);
  }

  start() {
    this.mongoose.connect(this.connectionInfo);

    // TODO: Initialize results variables if need be
    return true;
  }

  /* Takes in the most recent measure calculation results for a single patient and records/aggregates them
    */
  handleResult(patient, result) {
    if (this.calculation_results[patient.id] == null) {
      this.calculation_results[patient.id] = {};
    }
    this.calculation_results[patient.id][result.embedded.measure_id] = result;
  }

  /* Stores the aggregate calculation of the patients in calculation_results in aggregate_result, then returns
    aggregate_result
    */
  aggregate() {

  }

  /* Wraps up structure for results storage and saves to the database */
  finish() {
    this.aggregate();

    for (let patient_id of Object.keys(this.calculation_results)) {
      for (let measure_id of Object.keys(this.calculation_results[patient_id])) {
        // TODO: Does the result have patient_id as part of it, or will we have to add it?
        this.calculation_results[patient_id][measure_id].save();
      }
    }
    return this.aggregate_result.save();
  }
}