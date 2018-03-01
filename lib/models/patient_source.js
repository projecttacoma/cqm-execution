const _ = require('lodash');
const QDMPatientSchema = require('cqm-models').PatientSchema;
const mongoose = require('mongoose');

module.exports = class MongoDBPatientSource {
  /* Insert documentation here
    */

  constructor(connectionInfo) {
    mongoose.connect(connectionInfo);

    this.QDMPatient = mongoose.model('Patient', QDMPatientSchema);

    this.patients = [];
    this.index = 0;
  }

  findPatients(patientIds, options = { query_field: 'object_id' }) {
    this.index = 0;
    this.patients = [];

    let patientIdsList = Array.isArray(patientIds) ? patientIds : [patientIds];

    this.patients = this.QDMPatient.find({
      // Need to transform the input array using mongoose.Types.ObjectId()
      _id: { $in: _.map(patientIdsList, mongoose.Types.ObjectId) }
    }, (err, patients) => {
      if (err) return console.error(err);
    });


    return this.patients;
  }

  reset() {
    this.index = 0;
  }

  getLength() {
    return this.patients.length();
  }

  next() {
    if (this.index >= this.patients.length) {
      return null;
    }
    const nextPatient = this.patients[this.index];
    this.index += 1;
    return nextPatient;
  }
}