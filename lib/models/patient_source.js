const QDMPatientSchema = require('cqm-models').PatientSchema;

module.exports = class PatientSource {
  constructor(patients) {
    this.patients = patients;
    return this.index = 0;
  } 
  currentPatient() {
    if (this.index < this.patients.length) {
      return this.patients[this.index];
    }
  }
  nextPatient() {
    return this.index += 1;
  }
};
