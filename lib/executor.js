const CqlCalculator = require('./models/cql_calculator');
const MeasureSource = require('./models/measure_source');
const PatientSource = require('./models/patient_source');
const ValueSetSource = require('./models/value_set_source');
const CypressHandler = require('./handlers/cypress_mongo_handler');


module.exports = class Executor {
  /* Creates a new executor
    @params [MeasureSource] measureSource -- the source to retrieve the executatble measures from
    */
  constructor(connectionInfo) {
    this.connectionInfo = connectionInfo;
    this.cqlCalculator = new CqlCalculator();
    this.measureSource = new MeasureSource(connectionInfo);
    this.patientSource = new PatientSource(connectionInfo);
    this.valueSetSource = new ValueSetSource(connectionInfo);
  }

  /*
  Generates the executable measures for calculation
  @params [array] measureIds -- the measures to generate
  @params [object] options -- options used to generate the measures such as
  effective_date, enable_logging ....
  @returns [Promise] a promise of executable measures

  */
  async getMeasuresById(measureIds) {
    const measurePromises = [];
    // measureIds parameter will either be a single id or multiple ids.
    // If the former, transform it to an array
    if (measureIds == null) {
      return Promise.all(measurePromises);
    }
    const measureIdsList = Array.isArray(measureIds) ? measureIds : [measureIds];
    measureIdsList.forEach(async (id) => {
      const mes = this.measureSource.findMeasure(id);
      measurePromises.push(mes);
    });
    return Promise.all(measurePromises);
  }

  /*
  Generates the QDM patients for calculation
  @params [array] patientIds -- the patients to generate
  @returns [Promise] a promise of executable patients

  */
  async getPatientsById(patientIds) {
    // patientIds parameter will either be a single id or multiple ids.
    // If the former, transform it to an array
    const patientIdsList = Array.isArray(patientIds) ? patientIds : [patientIds];

    return this.patientSource.findPatients(patientIdsList);
  }

  /*
   Executes measures against a given patient source
   @params {array} patientIds -- the array of patient ids for which results are requested. The patients all adhere to the QDM data model in MongoDB

   @params {array} measureIds -- the array of measures to execute. The ids can be CMS ids with the included sub_id if applicable, the hqmfId with the
   included sub_id if applicable or a json object that contains {measure_id: (CMS or HQMF_ID), sub_id: "" }

   @params {object} options -- json object with calculation option such as handler information, etc ....

   @params {object} options - handler information -- the pateint level results handler.  During calculation patient level results will be given to this object to handle in some fashion
   such as saving to a database.  The handler needs to implement the start() finsihed() and handleResult(p_level_result) methods.  start() should basically reset the handler and
   get it ready for calculation, handleResult(presults) will perfrom some task on the handler and finished() allows the handler to know when the paitent
   level calculations are finsihed and it can perform any post processing that needs to be perfromed, such as aggregating results

   */
  async execute(patientIds, measureIds, options = null) {
    await this.getPatientsById(patientIds);
    const measures = await this.getMeasuresById(measureIds);

    const executor = this;

    let handler;

    if (!options || !options.handlerType || options.handlerType === 'CypressMongo') {
      handler = new CypressHandler(this.connectionInfo);
    }

    handler.start(options);
    // TODO: Pass in start of measure period as option
    await this.valueSetSource.findValueSetsByMongoidForMeasures(measures, (self) => {
      // TODO: Change param order
      executor.executeForEachMeasure(measures, self.valueSetsByMongoid, handler, options);
    });
    return handler.finish();
  }

  executeForEachMeasure(measures, valueSetsByMongoid, handler, options) {
    measures.forEach((mes) => {
      if (mes instanceof Error) {
        throw Error(mes);
      }
      const resultsByPid = this.cqlCalculator.calculate(
        mes,
        this.patientSource, valueSetsByMongoid, options
      );
      handler.handleResult(mes, resultsByPid);
    });
  }
};
