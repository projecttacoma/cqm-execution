"use strict" ;

var PatientSource = require('../../lib/models/patient_source.js');

describe("A MongoDB Patient Soure", function() {
  let connectionInfo = "mongodb://127.0.0.1:27017/js-ecqme-test";
  let patient_source = new PatientSource(connectionInfo);

  it("iterates through and returns a stored patient list", function() {
    // TODO: store patient list (2) in PatientSource

    let patient_id_1 = patient_source.next().medical_record_number;
    let patient_id_2 = patient_source.next().medical_record_number;

    expect(patient_id_1).not.toBe(patient_id_2);

    let patient_3 = patient_source.next();

    expect(patient_3).toBeNull();
  });

  it("iterates through then resets position in a stored patient list", function() {
    // TODO: store patient list in PatientSource

    let patient_id_1 = patient_source.next().medical_record_number;

    let patient_2 = patient_source.next();
    while (patient_2 != null) {
      patient_2 = patient_source.next();
    }

    patient_source.reset();
    let patient_id_2 = patient_source.next().medical_record_number;

    expect(patient_id_1).toBe(patient_id_2);
  });

  it("gets a list of MongoDB patients by one or more patient IDs", function() {
    // TODO

    expect(true).toBe(true);
  });
});