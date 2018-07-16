// This is a wrapper class for an array of QDM Patients
// This class adds functions used by the execution engine to
// traverse an array of QDM Patients
module.exports = class PatientSource {
  constructor(patients) {
    this.patients = patients;
    this.index = 0;
  }
  currentPatient() {
    if (this.index < this.patients.length) {
      return this.patients[this.index];
    }
    return null;
  }
  nextPatient() {
    this.index += 1;
  }
};
