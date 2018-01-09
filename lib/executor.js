"use strict" ;

module.exports = class Executor {
    /* Creates a new executor
    @params [MeasureSource] measure_source -- the source to retrieve the executatble measures from
    */
  constructor(measure_source) {
    this.measure_source = measure_source;
  }

  /*
  Generates the executable measures for calculation
  @params [array] measure_ids -- the measures to generate
  @params [object] options -- options used to generate the measures such as effective_date, enable_logging ....
  @returns [array] an array of executable measures

  */
  get_measures_by_id(measure_ids, options) {
    var measures = [];
    // measure_ids parameter will either be a single id or multiple ids.
    // If the former, transform it to an array
    measure_ids = Array.isArray(measure_ids) ? measure_ids : [measure_ids];
    measure_ids.forEach(id => {
      var mes = this.measure_source.getMeasure(id);
      measures.push(mes.generate(options));
    });
    return measures;
  }

  /*
   Executes measures against a given patient source
   @params [PatientSource] patient_source -- the source for patient records .  PatientSource objects basically need to implement 2 methods for the purpose
   of this method , reset() and next() .. reset() should do just that reset the source to the beginging , next() while the source has more records next should
   return the next record until there are none left to calculate, then it should return null. Records returned need to adhere to the constructs of the
   hQuery Patient API.

   @params {array} measure_ids -- the array of measures to execute. The ids can be CMS ids with the included sub_id if applicable, the hqmfId with the
   included sub_id if applicable or a json object that contains {measure_id: (CMS or HQMF_ID), sub_id: "" }

   @params {object} handler -- the pateint level results handler.  During calculation patient level results will be given to this object to handle in some fashion
   such as saving to a database.  The handler needs to implement the start() finsihed() and handleResult(p_level_result) methods.  start() should basically reset the handler and
   get it ready for calculation, handleResult(presults) will perfrom some task on the handler and finished() allows the handler to know when the paitent
   level calculations are finsihed and it can perform any post processing that needs to be perfromed, such as aggregating results

   @params {object} options -- json object with calculation option ssuch as effective_date , enable_logging ....
   */
  execute(patient_source, measure_ids, handler, options) {
    patient_source.reset();
    handler.start();
    var measures = this.generate_measures(measure_ids, options);
    var curr_patient = null;
    while( curr_patient = patient_source.next() ) {
      measurs.forEach( mes => {
        var result = mes.calculate(patient, options.effective_date, options.correlation_id);
        handler.handleResult(result);
      });
    }

    handler.finish();
  }
}