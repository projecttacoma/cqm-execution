const Executor = require('../lib/executor');

const valueSetsHash = require('./fixtures').value_sets;
const patientsHash = require('./fixtures').patients;
const measuresHash = require('./fixtures').measures;
const Sinon = require('sinon');
require('sinon-mongoose');

describe('A Javascript CQL Calculation Executor', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  const executor = new Executor(connectionInfo);
  const valueSetsByOid = {};
  let testPatients;
  let testPatientIds;
  let testMeasure;
  let testMeasureIds;
  const testValueSets = [];

  const mockMeasures = Sinon.mock(executor.measureSource.CQLMeasure);
  let mockMeasuresExpects;
  const mockPatients = Sinon.mock(executor.patientSource.QDMPatient);
  let mockPatientsExpects;
  const mockValueSets = Sinon.mock(executor.valueSetSource.ValueSet);
  let mockValueSetsExpects;


  beforeAll(() => {
    mockMeasuresExpects = mockMeasures.expects('findOne').exactly(2);
    mockPatientsExpects = mockPatients.expects('find').exactly(2);
    mockValueSetsExpects = mockValueSets.expects('find').exactly(2);

    // Initialize patients and measures and value_sets, similar way as cql_calculator_spec.js
    let valueSetMongo;
    Object.values(valueSetsHash).forEach((valueSet) => {
      valueSetMongo = executor.valueSetSource.ValueSet(valueSet);

      if (!(valueSet.oid in valueSetsByOid)) {
        valueSetsByOid[valueSet.oid] = {};
      }
      valueSetsByOid[valueSet.oid][valueSet.version] = valueSetMongo;
    });

    testPatients = [
      executor.patientSource
        .QDMPatient(patientsHash['B N_STROKE_88d7f5c0-1665-0135-6ded-20999b0ed66f']),
      executor.patientSource
        .QDMPatient(patientsHash['6 N_STROKE_8b8c3870-1665-0135-6ded-20999b0ed66f']),
    ];
    testPatientIds = [testPatients[0]._id, testPatients[1]._id];

    testMeasure = executor.measureSource.CQLMeasure(measuresHash.CMS105v7);
    const tempMeasureValueSets = [];
    measuresHash.CMS105v7.value_set_oid_version_objects.forEach((versionObject) => {
      testValueSets.push(valueSetsByOid[versionObject.oid][versionObject.version]);
      tempMeasureValueSets.push(valueSetsByOid[versionObject.oid][versionObject.version]._id);
    });
    testMeasure.value_sets = tempMeasureValueSets;
    testMeasureIds = [testMeasure._id.toString()];
  });

  afterAll(() => {
    mockMeasures.restore();
    mockPatients.restore();
    mockValueSets.restore();
  });

  it('runs and returns CQL Measure calculations given patient IDs and measure IDs', async () => {
    mockMeasuresExpects.yields(null, testMeasure);
    mockPatientsExpects.yields(null, testPatients);
    mockValueSetsExpects.yields(null, testValueSets);

    Promise.resolve(executor.execute(testPatientIds, testMeasureIds))
      .then((allResults) => {
        expect(allResults.Individual[testMeasureIds[0]][testPatientIds[0]].NUMER).toBe(1);
        expect(allResults.Individual[testMeasureIds[0]][testPatientIds[1]].DENEXCEP).toBe(1);
        expect(allResults.Aggregate[testMeasureIds[0]].IPP).toBe(2);
        expect(allResults.Aggregate[testMeasureIds[0]].DENOM).toBe(2);
      });
  });

  it('runs and returns CQL Measure calculations with effective_date option', () => {
    mockMeasuresExpects.yields(null, testMeasure);
    mockPatientsExpects.yields(null, testPatients);
    mockValueSetsExpects.yields(null, testValueSets);

    Promise.resolve(executor.execute(
      testPatientIds,
      testMeasureIds, { effective_date: '201201010000' }
    )).then((allResults) => {
      expect(allResults.Individual[testMeasureIds[0]][testPatientIds[0]].NUMER).toBe(1);
      expect(allResults.Individual[testMeasureIds[0]][testPatientIds[1]].DENEXCEP).toBe(1);
      expect(allResults.Aggregate[testMeasureIds[0]].IPP).toBe(2);
      expect(allResults.Aggregate[testMeasureIds[0]].DENOM).toBe(2);
    });
  });
});
