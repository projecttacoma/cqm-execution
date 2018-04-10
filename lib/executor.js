const Result = require('./models/result.js');

module.exports = class Executor {
  /* Creates a new executor
    @params [MeasureSource] measureSource -- the source to retrieve the executatble measures from
    */
  constructor(measureSource) {
    this.measureSource = measureSource;
  }

  /*
  Generates the executable measures for calculation
  @params [array] measureIds -- the measures to generate
  @params [object] options -- options used to generate the measures such as
  effective_date, enable_logging ....
  @returns [array] an array of executable measures

  */
  async getMeasuresById(measureIds) {
    const measurePromises = [];
    // measureIds parameter will either be a single id or multiple ids.
    // If the former, transform it to an array
    const measureIdsList = Array.isArray(measureIds) ? measureIds : [measureIds];
    measureIdsList.forEach(async (id) => {
      const mes = this.measureSource.findMeasure(id);
      measurePromises.push(mes);
    });
    return Promise.all(measurePromises);
  }

  /*
   Executes measures against a given patient source
   @params [PatientSource] patientSource -- the source for patient records.

   @params {array} measureIds -- the array of measures to execute. The ids can be CMS ids with the included sub_id if applicable, the hqmfId with the
   included sub_id if applicable or a json object that contains {measure_id: (CMS or HQMF_ID), sub_id: "" }

   @params {object} handler -- the pateint level results handler.  During calculation patient level results will be given to this object to handle in some fashion
   such as saving to a database.  The handler needs to implement the start() finsihed() and handleResult(p_level_result) methods.  start() should basically reset the handler and
   get it ready for calculation, handleResult(presults) will perfrom some task on the handler and finished() allows the handler to know when the paitent
   level calculations are finsihed and it can perform any post processing that needs to be perfromed, such as aggregating results

   @params {object} options -- json object with calculation option ssuch as effective_date , enable_logging ....
   */
  async execute(patientSource, valueSetSource, measureIds, handler, options) {
    const measures = await this.getMeasuresById(measureIds);
    const executor = this;
    handler.start();

    valueSetSource.findValueSetsByMongoidForMeasures(measures, (self) => {
      let patient = patientSource.nextPatient();
      while (patient != null) {
        executor.executeSinglePatient(patient, self.valueSetsByMongoid, measures, handler, options);
        patient = patientSource.nextPatient();
      }
      handler.finish();
    });
  }

  static executeSinglePatient(patient, valueSetsByMongoid, measures, handler, options) {
    measures.forEach((mes) => {
      if (mes instanceof Error) {
        Error(mes);
      }
      const result = Result();

      result.calculate(
        patient, mes, valueSetsByMongoid,
        options.effectiveDate, options.correlationId
      ); // TODO: What are the two options for?
      handler.handleResult(patient, mes, result);
    });
  }
};
