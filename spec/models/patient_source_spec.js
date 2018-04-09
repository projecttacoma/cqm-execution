const PatientSource = require('../../lib/models/patient_source.js');

describe('A MongoDB Patient Source', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  const patientSource = new PatientSource(connectionInfo);

  it('iterates through and returns a stored patient list', () => {
    patientSource.patients = [
      { _id: '123456', given_names: ['A', 'B'], family_name: 'C' },
      { _id: '654456', given_names: ['C', 'B'], family_name: 'A' },
    ];

    patientSource.reset();
    const patientId1 = patientSource.nextPatient().family_name;
    const patientId2 = patientSource.nextPatient().family_name;

    expect(patientId1).not.toBe(patientId2);

    const patient3 = patientSource.nextPatient();

    expect(patient3).toBeNull();
  });

  it('iterates through then resets position in a stored patient list', () => {
    patientSource.patients = [
      { _id: '123456', given_names: ['A', 'B'], family_name: 'C' },
      { _id: '654456', given_names: ['C', 'B'], family_name: 'A' },
    ];

    patientSource.reset();
    const patientId1 = patientSource.nextPatient()._id;

    let patient2 = patientSource.nextPatient();
    while (patient2 != null) {
      patient2 = patientSource.nextPatient();
    }

    patientSource.reset();
    const patientId2 = patientSource.nextPatient()._id;

    expect(patientId1, patientId2).toBeDefined();
    expect(patientId1).toBe(patientId2);
  });

  it('gets a list of MongoDB patients by one or more patient IDs', () => {
    const patientMongo = patientSource.QDMPatient({ given_names: ['A', 'B'], family_name: 'C' });

    const patientId1 = patientMongo._id;

    patientMongo.save((err) => {
      if (err) return Error(err);

      patientSource.findPatients(patientId1, (self) => {
        expect(self.nextPatient().family_name).toBe('C');
        expect(self.nextPatient()).toBeNull();
      });
      return null;
    });
  });
});
