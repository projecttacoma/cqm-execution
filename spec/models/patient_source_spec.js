"use strict" ;

var PatientSource = require('../../lib/models/patient_source.js');

describe("A MongoDB Patient Soure", function() {
  let connectionInfo = "mongodb://127.0.0.1:27017/js-ecqme-test";
  let patient_source = new PatientSource(connectionInfo);

  it("iterates through and returns a stored patient list", function() {
    patient_source.patients = [
      { _id: '123456', given_names: ['A', 'B'], family_name: 'C' },
      { _id: '654456', given_names: ['C', 'B'], family_name: 'A' },
    ];

    patient_source.reset();
    let patient_id_1 = patient_source.next()._id;
    let patient_id_2 = patient_source.next()._id;

    expect(patient_id_1).not.toBe(patient_id_2);

    let patient_3 = patient_source.next();

    expect(patient_3).toBeNull();
  });

  it("iterates through then resets position in a stored patient list", function() {
    patient_source.patients = [
      { _id: '123456', given_names: ['A', 'B'], family_name: 'C' },
      { _id: '654456', given_names: ['C', 'B'], family_name: 'A' },
    ];

    patient_source.reset();
    let patient_id_1 = patient_source.next().id;

    let patient_2 = patient_source.next();
    while (patient_2 != null) {
      patient_2 = patient_source.next();
    }

    patient_source.reset();
    let patient_id_2 = patient_source.next().id;

    expect(patient_id_1).toBe(patient_id_2);
  });

  it("gets a list of MongoDB patients by one or more patient IDs", function() {
    let patient_mongo = patient_source.QDMPatient({ given_names: ['A', 'B'], family_name: 'C' });

    let patient_id_1 = patient_mongo.id;

    patient_mongo.save(function (err, doc) {
      if (err) return console.error(err);

      patient_source.findPatients(patient_id_1, function(patient_source) {
        if (err) return console.error(err);
        
        expect(patient_source.next().family_name).toBe('C');
        expect(patient_source.next()).toBeNull();
      });

    });

  });
});