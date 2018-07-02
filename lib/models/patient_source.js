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
