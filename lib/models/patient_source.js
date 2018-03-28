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

  async findPatients(patientIds, callback = null) {
    const self = this;
    this.index = 0;
    this.patients = [];

    const patientIdsList = Array.isArray(patientIds) ? patientIds : [patientIds];

    return this.QDMPatient.find({
      // Need to transform the input array using mongoose.Types.ObjectId()
      _id: { $in: _.map(patientIdsList, mongoose.Types.ObjectId) },
    }, (err, patients) => {
      if (err) return Error(err);

      self.patients = patients;

      if (callback != null) {
        callback(self);
      }
      return null;
    });
  }

  reset() {
    this.index = 0;
  }

  getLength() {
    return this.patients.length();
  }

  currentPatient() {
    return this.patients[this.index];
  }

  nextPatient() {
    if (this.index >= this.patients.length) {
      return null;
    }
    const nextPatient = this.currentPatient();
    this.index += 1;
    return nextPatient;
  }
};
