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

    this.correlationId = null;
    this.effectiveDate = null;
  }

  start(options) {
    mongoose.connect(this.connectionInfo);
    this.IndividualResult = mongoose.model('IndividualResult', IndividualResultSchema);
    this.individualResultsByMeasureId = {};
    this.aggregateResultsByMeasureId = {};
    if (options) {
      this.correlationId = options.correlation_id;
      this.effectiveDate = options.effective_date;
    }
    this.finished = false;
    return true;
  }

  /* Takes in the most recent measure calculation results for a single patient and records/aggregates them
    */
  handleResult(measure, resultsByPatientId) {
    this.individualResultsByMeasureId[measure._id] = resultsByPatientId;
  }

  /* Wraps up individual and aggregate results and saves to the database */
  finish() {
    if (this.finished) {
      throw new Error('Handler cannot be finished until it is started.');
    } else {
      Object.keys(this.individualResultsByMeasureId).forEach((measureId) => {
        // Aggregate results for a specific measureId
        this.aggregate(measureId);
        Object.keys(this.individualResultsByMeasureId[measureId]).forEach((patientId) => {
          // IndividualResult data gets reinstantiated in an object with a MongoDB connection
          const patientResultMongo =
            this.IndividualResult(this.individualResultsByMeasureId[measureId][patientId]
              .toObject());
          this.individualResultsByMeasureId[measureId][patientId] = patientResultMongo;
          if (patientResultMongo.state === 'running') {
            patientResultMongo.state = 'complete';
          }

          // Add necessary Cypress data to the extended_data tab
          if (!patientResultMongo.extended_data) {
            patientResultMongo.extended_data = {};
          }
          if (this.correlationId) {
            patientResultMongo.extended_data.correlation_id = this.correlationId;
          }
          if (this.effectiveDate) {
            patientResultMongo.extended_data.effective_date = this.effectiveDate;
          }

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

  /* Stores the aggregate calculation of the patients in calculationResults in
     aggregateResultsByMeasureId, then returns
     aggregateResultsByMeasureId
    */
  aggregate(measureId) {
    // TODO: Finish implementing this once the AggregateResult object is implemented
    if (!this.aggregateResultsByMeasureId[measureId]) {
      this.aggregateResultsByMeasureId[measureId] = this.IndividualResult();
    }
    Object.keys(this.individualResultsByMeasureId[measureId]).forEach((patientId) => {
      // For each patient, add it to the relevant aggregate
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
    // TODO: This can be condensed to the following code as soon as
    //       IndividualResult puts this all in population_criteria:
    // const aggregatePopAttributes = aggregate.population_attributes;
    // Object.keys(individualResult.population_attributes).forEach((popKey) => {
    //   if (individualResult.population_attributes[popKey] != null) {
    //     aggregatePopAttributes[popKey] =
    //       (individualResult.population_attributes[popKey] || 0)
    //         + (aggregatePopAttributes[popKey] || 0);
    //   }
    // });
    if (individualResult.get('STRAT') != null) {
      aggregate.set({
        STRAT: (individualResult.get('STRAT') || 0) + (aggregate.get('STRAT') || 0),
      });
    }
    if (individualResult.get('IPP') != null) {
      aggregate.set({
        IPP: (individualResult.get('IPP') || 0) + (aggregate.get('IPP') || 0),
      });
    }
    if (individualResult.get('DENOM') != null) {
      aggregate.set({
        DENOM: (individualResult.get('DENOM') || 0) + (aggregate.get('DENOM') || 0),
      });
    }
    if (individualResult.get('NUMER') != null) {
      aggregate.set({
        NUMER: (individualResult.get('NUMER') || 0) + (aggregate.get('NUMER') || 0),
      });
    }
    if (individualResult.get('NUMEX') != null) {
      aggregate.set({
        NUMEX: (individualResult.get('NUMEX') || 0) + (aggregate.get('NUMEX') || 0),
      });
    }
    if (individualResult.get('DENEX') != null) {
      aggregate.set({
        DENEX: (individualResult.get('DENEX') || 0) + (aggregate.get('DENEX') || 0),
      });
    }
    if (individualResult.get('DENEXCEP') != null) {
      aggregate.set({
        DENEXCEP: (individualResult.get('DENEXCEP') || 0) + (aggregate.get('DENEXCEP') || 0),
      });
    }
    if (individualResult.get('MSRPOPL') != null) {
      aggregate.set({
        MSRPOPL: (individualResult.get('MSRPOPL') || 0) + (aggregate.get('MSRPOPL') || 0),
      });
    }
    if (individualResult.get('OBSERV') != null) {
      aggregate.set({
        OBSERV: (individualResult.get('OBSERV') || 0) + (aggregate.get('OBSERV') || 0),
      });
    }
    if (individualResult.get('MSRPOPLEX') != null) {
      aggregate.set({
        MSRPOPLEX: (individualResult.get('MSRPOPLEX') || 0) + (aggregate.get('MSRPOPLEX') || 0),
      });
    }
    return aggregate;
  }
};
