"use strict" ;

module.exports = class Handler {
  /* Initializes cumulative results structure for storage at finish time
  */
  start() {
    return
  }

  /* Takes in the most recent measure calculation results for a single patient and records/aggregates them
  */
  handleResult(result) {

  }

  /* Wraps up structure for results storage and saves to the database
  */
  finish() {
    return
  }
}