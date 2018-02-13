"use strict" ;

patient_schema = require('cqm-models').PatientSchema;

module.exports = class MongoDBPatientSource {
  /* Insert documentation here
    */

  constructor(connectionInfo) {
    this.mongoose = require('mongoose');
    this.mongoose.connect(connectionInfo);

    this.patientMongo = this.mongoose.model('Patient', patient_schema)

    this.patients = [];
    this.index = 0;
  }

  findPatients(patientIds, options = { query_field: "object_id" }) {
    let patientIdsList = Array.isArray(patientIds) ? patientIds : [patientIds];
    // Is there a separate id assigned to a patient or do we go by Mongo Object ID?
    // If Mongo ID, need to transform the input array using mongoose.Types.ObjectId()
    if (query_field == "medical_record_number") {
      this.patientMongo.find({
        'medical_record_number': { $in: patientIds }
      }, function(err, patients) {
        if (err) return console.error(err);
        this.index = 0;
        this.patients = patients;
      });
    } else {
      this.patientMongo.find({
        '_id': { $in: _.map(patientIds, mongoose.Types.ObjectId) }
      }, function(err, patients) {
        if (err) return console.error(err);
        this.index = 0;
        this.patients = patients;
      });
    }

    return this.patientList;
  }

  reset() {
    this.index = 0;
  }

  get_length() {
    return this.patients.length();
  }

  next() {
    if (this.index >= this.patients.length) {
      return null;
    }
    return this.patients[this.index++];
  }
}