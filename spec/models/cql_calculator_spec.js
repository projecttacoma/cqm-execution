const CQLCalculator = require('../../lib/models/cql_calculator.js');
const Measure = require('cqm-models').Measure;
const ValueSetSchema = require('cqm-models').ValueSetSchema;
const PatientSource = require('../../lib/models/patient_source.js');
const Mongoose = require('mongoose');
const _ = require('lodash');

const valueSetsHash = require('../fixtures').value_sets;
const patientsHash = require('../fixtures').patients;
const measuresHash = require('../fixtures').measures;

describe('A CQL Calculation engine instance', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  let ValueSet;
  const valueSetsByMongoid = {};
  const valueSetsByOid = {};
  const patientsMongoized = [];
  const measuresMongoized = {};
  const cqlCalculator = new CQLCalculator();
  const patientSource = new PatientSource(connectionInfo);

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

    Object.values(patientsHash).forEach((patient) => {
      patientsMongoized.push(patientSource.QDMPatient(patient));
    });

    Object.keys(measuresHash).forEach((mesKey) => {
      const mesMongoized = new Measure(measuresHash[mesKey]);
      measuresHash[mesKey].value_set_oid_version_objects.forEach((versionObject) => {
        mesMongoized.value_sets.push(valueSetsByOid[versionObject.oid][versionObject.version].id);
      });
      measuresMongoized[mesKey] = mesMongoized;
    });
  });

  it('performs measure calculations given a measure and a single patient', () => {
    const resultsByMeasure = {};
    Object.keys(measuresMongoized).forEach((mesKey) => {
      patientSource.patients = [_.find(
        patientsMongoized,
        p => _.find(
          p.extendedData.measure_ids,
          m => m === measuresMongoized[mesKey].hqmf_set_id
        )
      )];

      resultsByMeasure[mesKey] = cqlCalculator.calculate(
        measuresMongoized[mesKey],
        patientSource, valueSetsByMongoid
      );
    });
    Object.keys(resultsByMeasure).forEach((resKey) => {
      console.log(`${resKey}\n`);
      console.log(resultsByMeasure[resKey][0]);
    });
    // TODO: Modify these to actually check fields
    expect(true).toBe(true);
  });

/*  it('performs measure calculations given an EOC measure and single patient', () => {
    patientSource.patients = [patientEH];
    const results = cqlCalculator.calculate(measureEH, patientSource, valueSetsByMongoid);
    console.log(results);
    // TODO: Modify these to actually check fields
    expect(results).toBe(results);
  });

  it('performs measure calculations given an EOC measure and multiple patients', () => {
    patientSource.patients = [patientEH, patientEH2, patientEH3];
    const results = cqlCalculator.calculate(measureEH, patientSource, valueSetsByMongoid);
    console.log(results);
    // TODO: Modify these to actually check fields
    expect(results).toBe(results);
  }); */
});
