const Result = require('./models/result.js');
const mongoose = require('mongoose');

module.exports = class Handler {
  /* Initializes cumulative results structure for storage at finish time, and initializes connection to MongoDB
    */
  constructor(connectionInfo) {
    this.connectionInfo = connectionInfo;

    /* Individual patient results, hashed by patient_id */
    this.calculation_results = {};
    /* Aggregate patient results, calculated at finish */
    this.aggregate_result = new Result(connectionInfo);
  }

  start() {
    mongoose.connect(this.connectionInfo);

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

  /* Stores the aggregate calculation of the patients in calculationResults in
     aggregateResult, then returns
     aggregateResult
    */
  aggregate() {
    return this.aggregateResult;
  }

  /* Wraps up structure for results storage and saves to the database */
  finish() {
    this.aggregate();
    Object.keys(this.calculation_results).forEach((patientId) => {
      Object.keys(this.calculation_results[patientId]).forEach((measureId) => {
        // TODO: Does the result have patient_id as part of it, or will we have to add it?
        this.calculation_results[patientId][measureId].save();
      });
    });
    return this.aggregate_result.save();
  }
};
