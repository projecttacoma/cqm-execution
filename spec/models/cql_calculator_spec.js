const CQLCalculator = require('../../lib/models/cql_calculator.js');
const Measure = require('cqm-models').Measure;
const ValueSetSchema = require('cqm-models').ValueSetSchema;
const Patient = require('cqm-models').Patient;
const PatientSource = require('../../lib/models/patient_source.js');
const Mongoose = require('mongoose');

const PatientEP = require('../fixtures/patients/ep/A_Diabetes Adult_good.json');
const PatientEH = require('../fixtures/patients/eh/4_ED_good.json');
const PatientEH2 = require('../fixtures/patients/eh/A_STROKE_good.json');
const MeasureEP = require('../fixtures/measures/ep/CMS122v7.json');
const MeasureEH = require('../fixtures/measures/eh/CMS32v8b.json');

const valueSetsHash = require('../fixtures').value_sets;

describe('A CQL Calculation engine instance', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  let ValueSet;
  const valueSetsByMongoid = {};
  const valueSetsByOid = {};
  const cqlCalculator = new CQLCalculator();
  const patientSource = new PatientSource('mongodb://127.0.0.1:27017/js-ecqme-test');

  const patientEP = patientSource.QDMPatient(PatientEP);
  const patientEH = patientSource.QDMPatient(PatientEH);
  const patientEH2 = new Patient(PatientEH2);
  const measureEP = new Measure(MeasureEP);
  const measureEH = new Measure(MeasureEH);

  beforeAll(() => {
    let valueSetMongo;
    Mongoose.connect(connectionInfo);
    ValueSet = Mongoose.model('ValueSet', ValueSetSchema);
    Object.values(valueSetsHash).forEach((valueSet) => {
      valueSetMongo = ValueSet(valueSet);
      valueSetsByMongoid[valueSetMongo.id] = valueSetMongo;

      if (!(valueSet.oid in valueSetsByOid)) {
        valueSetsByOid[valueSet.oid] = {};
      }
      valueSetsByOid[valueSet.oid][valueSet.version] = valueSetMongo;
    });

    MeasureEP.value_set_oid_version_objects.forEach((versionObject) => {
      measureEP.value_sets.push(valueSetsByOid[versionObject.oid][versionObject.version].id);
    });

    MeasureEH.value_set_oid_version_objects.forEach((versionObject) => {
      measureEH.value_sets.push(valueSetsByOid[versionObject.oid][versionObject.version].id);
    });
  });

  it('performs measure calculations given a measure and single EP patient', () => {
    patientSource.patients = [patientEP];
    const results = cqlCalculator.calculate(measureEP, patientSource, valueSetsByMongoid);
    expect(true).toBe(true);
  });

  it('performs measure calculations given an EOC measure and single patient', () => {
    patientSource.patients = [patientEH];
    const results = cqlCalculator.calculate(measureEH, patientSource, valueSetsByMongoid);
    expect(true).toBe(true);
  });

  it('performs measure calculations given an EOC measure and multiple patients', () => {
    patientSource.patients = [patientEH, patientEH2];
    const results = cqlCalculator.calculate(measureEH, patientSource, valueSetsByMongoid);
    expect(true).toBe(true);
  });
});
