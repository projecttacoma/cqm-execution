"use strict" ;

module.exports = class Handler {
  /* Initializes cumulative results structure for storage at finish time, and initializes connection to MongoDB
    */

  /* TODO: Placeholder mongodb url */
  mongo_url = "";

  /* Individual patient results, hashed by patient_id */
  calculation_results = {};
  /* Aggregate patient results, calculated at finish */
  aggregate_result = Result();

  start() {
    // TODO: Mongodb Connection

    // TODO: Initialize results variables if need be
    return
  }

  /* Takes in the most recent measure calculation results for a single patient and records/aggregates them
    */
  handleResult(patient, result) {
    this.calculation_results[patient.id][result.measure_id] = result;
  }

  /* Stores the aggregate calculation of the patients in calculation_results in aggregate_result, then returns
    aggregate_result
    */
  aggregate() {

  }

  /* Wraps up structure for results storage and saves to the database */
  finish() {
    this.aggregate();

    // TODO: Mongodb call to save results by inserting them as records
    return
  }
}