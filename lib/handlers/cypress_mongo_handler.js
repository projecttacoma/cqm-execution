const mongoose = require('mongoose');
const IndividualResultSchema = require('cqm-models').IndividualResultSchema;

module.exports = class Handler {
  /* Initializes cumulative results structure for storage at finish time, and initializes connection to MongoDB
    */
  constructor(connectionInfo) {
    this.connectionInfo = connectionInfo;

    this.finished = true;

    /* Individual patient results, hashed by measure id and patient id */
    this.individualResultsByMeasureId = {};
    /* Aggregate patient results, calculated at finish */
    this.aggregateResultsByMeasureId = {};
    this.IndividualResult = mongoose.model('IndividualResult', IndividualResultSchema);
  }

  start() {
    mongoose.connect(this.connectionInfo);
    this.individualResultsByMeasureId = {};
    this.aggregateResultsByMeasureId = {};
    this.finished = false;
    return true;
  }

  /* Takes in the most recent measure calculation results for a single patient and records/aggregates them
    */
  handleResult(measure, resultsByPatientId) {
    this.individualResultsByMeasureId[measure._id] = resultsByPatientId;
  }

  /* Stores the aggregate calculation of the patients in calculationResults in
     aggregateResult, then returns
     aggregateResult
    */
  aggregate(measureId) {
    // TODO: Implement this once the AggregateResult object is implemented
    return this.aggregateResultsByMeasureId[measureId];
  }

  /* Wraps up individual and aggregate results and saves to the database */
  finish() {
    if (this.finished) {
      throw new Error('Handler cannot be finished until it is started.');
    } else {
      this.aggregate();
      Object.keys(this.individualResultsByMeasureId).forEach((measureId) => {
        this.aggregate(measureId);
        Object.values(this.individualResultsByMeasureId[measureId]).forEach((patientResult) => {
          const patientResultMongo = this.IndividualResult(patientResult);
          if (patientResultMongo.state === 'running') {
            patientResultMongo.state = 'complete';
          }
          patientResultMongo.save((err) => {
            if (err) throw Error(err);
          });
        });
      // TODO: Save aggregate results
      });
    }
    this.finished = true;
  }
};
