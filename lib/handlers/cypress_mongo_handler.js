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
  }

  start(options) {
    mongoose.connect(this.connectionInfo);
    this.IndividualResult = mongoose.model('IndividualResult', IndividualResultSchema);
    this.individualResultsByMeasureId = {};
    this.aggregateResultsByMeasureId = {};
    this.correlationId = options.correlation_id;
    this.effectiveDate = options.effective_date;
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
    // TODO: Finish implementing this once the AggregateResult object is implemented
    if (!this.aggregateResultsByMeasureId[measureId]) {
      this.aggregateResultsByMeasureId[measureId] = {};
    }
    Object.keys(this.individualResultsByMeasureId[measureId]).forEach((patientId) => {
      this.aggregateResultsByMeasureId[measureId] =
        this.constructor.aggregateIndividualResults(
          this.aggregateResultsByMeasureId[measureId],
          this.individualResultsByMeasureId[measureId][patientId]
        );
    });
    return this.aggregateResultsByMeasureId[measureId];
  }

  static aggregateIndividualResults(aggregate, individualResult) {
    // TODO: Finish this to expand further than just population values
    if (individualResult.get('STRAT')) {
      aggregate.set({ STRAT: aggregate.get('STRAT') ? aggregate.get('STRAT') + 1 : 1 });
    }
    if (individualResult.get('IPP')) {
      aggregate.set({ IPP: aggregate.get('IPP') ? aggregate.get('IPP') + 1 : 1 });
    }
    if (individualResult.get('DENOM')) {
      aggregate.set({ DENOM: aggregate.get('DENOM') ? aggregate.get('DENOM') + 1 : 1 });
    }
    if (individualResult.get('NUMER')) {
      aggregate.set({ NUMER: aggregate.get('NUMER') ? aggregate.get('NUMER') + 1 : 1 });
    }
    if (individualResult.get('NUMEX')) {
      aggregate.set({ NUMEX: aggregate.get('NUMEX') ? aggregate.get('NUMEX') + 1 : 1 });
    }
    if (individualResult.get('DENEX')) {
      aggregate.set({ DENEX: aggregate.get('DENEX') ? aggregate.get('DENEX') + 1 : 1 });
    }
    if (individualResult.get('DENEXCEP')) {
      aggregate.set({ DENEXCEP: aggregate.get('DENEXCEP') ? aggregate.get('DENEXCEP') + 1 : 1 });
    }
    if (individualResult.get('MSRPOPL')) {
      aggregate.set({ MSRPOPL: aggregate.get('MSRPOPL') ? aggregate.get('MSRPOPL') + 1 : 1 });
    }
    if (individualResult.get('OBSERV')) {
      aggregate.set({ OBSERV: aggregate.get('OBSERV') ? aggregate.get('OBSERV') + 1 : 1 });
    }
    if (individualResult.get('MSRPOPLEX')) {
      aggregate.set({ MSRPOPLEX: aggregate.get('MSRPOPLEX') ? aggregate.get('MSRPOPLEX') + 1 : 1 });
    }
    return aggregate;
  }

  /* Wraps up individual and aggregate results and saves to the database */
  finish() {
    if (this.finished) {
      throw new Error('Handler cannot be finished until it is started.');
    } else {
      Object.keys(this.individualResultsByMeasureId).forEach((measureId) => {
        this.aggregate(measureId);
        Object.values(this.individualResultsByMeasureId[measureId]).forEach((patientResult) => {
          const patientResultMongo = this.IndividualResult(patientResult);
          if (patientResultMongo.state === 'running') {
            patientResultMongo.state = 'complete';
          }
          patientResultMongo.extended_data.correlation_id = this.correlationId;
          patientResultMongo.extended_data.effective_date = this.effectiveDate;
          patientResultMongo.save((err) => {
            if (err) throw Error(err);
          });
        });
      // TODO: Save aggregate results
      });
    }
    this.finished = true;
    // TODO: Return something needed specifically by Cypress
    return 0;
  }
};
