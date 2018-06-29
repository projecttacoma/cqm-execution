const CQLCalculator = require('../../lib/models/cql_calculator.js');
const QDMPatientSchema = require('cqm-models').PatientSchema;
const PatientSource = require('../../lib/models/patient_source.js');
const Mongoose = require('mongoose');
const getJSONFixture = require('../support/spec_helper.js').getJSONFixture;

describe('Calculates', () => {
  const cqlCalculator = new CQLCalculator();

  it('multiple population measure correctly', () => {
    const valueSetsByOid = getJSONFixture('measure_data/core_measures/CMS160/value_sets.json');
    const measure = getJSONFixture('measure_data/core_measures/CMS160/CMS160v6.json');
    // Build raw patients array
    const expiredDenex = getJSONFixture('records/core_measures/CMS160v6/Expired_DENEX.json');
    const passNumer2 = getJSONFixture('records/core_measures/CMS160v6/Pass_NUM2.json');
    const patients = [];
    patients.push(expiredDenex);
    patients.push(passNumer2);
    // Convert patients into patients that use QDM patient schema
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    // Wrap QDMPatients in PatientSchema so execution engine has functions it needs
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = cqlCalculator.calculate(measure, qdmPatientsSource, valueSetsByOid);

    // There's not a way to get the patient out by a patient ID
    expiredDenexResults = calculationResults[Object.keys(calculationResults)[0]];
    passNumer2Results = calculationResults[Object.keys(calculationResults)[1]];

    // Patient expiredDenexResults Population Set 1
    expect(expiredDenexResults['PopulationCriteria1'].IPP).toBe(1);
    expect(expiredDenexResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(expiredDenexResults['PopulationCriteria1'].DENEX).toBe(1);
    expect(expiredDenexResults['PopulationCriteria1'].NUMER).toBe(0);
    // Patient expiredDenexResults Population Set 2
    expect(expiredDenexResults['PopulationCriteria2'].IPP).toBe(0);
    expect(expiredDenexResults['PopulationCriteria2'].DENOM).toBe(0);
    expect(expiredDenexResults['PopulationCriteria2'].DENEX).toBe(0);
    expect(expiredDenexResults['PopulationCriteria2'].NUMER).toBe(0);
    // Patient expiredDenexResults Population Set 3
    expect(expiredDenexResults['PopulationCriteria3'].IPP).toBe(0);
    expect(expiredDenexResults['PopulationCriteria3'].DENOM).toBe(0);
    expect(expiredDenexResults['PopulationCriteria3'].DENEX).toBe(0);
    expect(expiredDenexResults['PopulationCriteria3'].NUMER).toBe(0);
    
    // Patient passNumer2Results Population Set 1
    expect(passNumer2Results['PopulationCriteria1'].IPP).toBe(0);
    expect(passNumer2Results['PopulationCriteria1'].DENOM).toBe(0);
    expect(passNumer2Results['PopulationCriteria1'].DENEX).toBe(0);
    expect(passNumer2Results['PopulationCriteria1'].NUMER).toBe(0);
    // Patient passNumer2Results Population Set 2
    expect(passNumer2Results['PopulationCriteria2'].IPP).toBe(1);
    expect(passNumer2Results['PopulationCriteria2'].DENOM).toBe(1);
    expect(passNumer2Results['PopulationCriteria2'].DENEX).toBe(0);
    expect(passNumer2Results['PopulationCriteria2'].NUMER).toBe(1);
    // Patient passNumer2Results Population Set 3
    expect(passNumer2Results['PopulationCriteria3'].IPP).toBe(0);
    expect(passNumer2Results['PopulationCriteria3'].DENOM).toBe(0);
    expect(passNumer2Results['PopulationCriteria3'].DENEX).toBe(0);
    expect(passNumer2Results['PopulationCriteria3'].NUMER).toBe(0);
  });
  
  it('single population EOC measure correctly', () => {
    const valueSetsByOid = getJSONFixture('measure_data/core_measures/CMS177/value_sets.json');
    const measure = getJSONFixture('measure_data/core_measures/CMS177/CMS177v6.json');
    const failIPP = getJSONFixture('records/core_measures/CMS177v6/Fail_IPP.json');
    const passNumer = getJSONFixture('records/core_measures/CMS177v6/Pass_Numer.json');
  
    const patients = [];
    patients.push(failIPP);
    patients.push(passNumer);
  
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = cqlCalculator.calculate(measure, qdmPatientsSource, valueSetsByOid);

    // There's not a way to get the patient out by a patient ID
    failIPPResults = calculationResults[Object.keys(calculationResults)[0]];
    passNumerResults = calculationResults[Object.keys(calculationResults)[1]];

    // Patiente failIPP Population Set 1
    expect(failIPPResults['PopulationCriteria1'].IPP).toBe(0);
    expect(failIPPResults['PopulationCriteria1'].DENOM).toBe(0);
    expect(failIPPResults['PopulationCriteria1'].NUMER).toBe(0);
    
    // Patiente failIPP Population Set 1
    expect(passNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].NUMER).toBe(1);

  });


});
