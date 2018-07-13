const Calculator = require('../../lib/models/calculator.js');
const QDMPatientSchema = require('cqm-models').PatientSchema;
const PatientSource = require('../../lib/models/patient_source.js');
const Mongoose = require('mongoose');
const getJSONFixture = require('../support/spec_helper.js').getJSONFixture;
const getEpisodeResults = require('../support/spec_helper.js').getEpisodeResults;

describe('Calculator', function() {
  describe('episode of care based relevance map', function() {
    it('is correct for patient with no episodes', function() {
      const valueSetsByOid = getJSONFixture('measures/CMS107v6/value_sets.json');
      const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS107v6/IPPFail_LOS=121Days.json'));
      const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
      const qdmPatients = patients.map(patient => new QDMPatient(patient));
      const qdmPatientsSource = new PatientSource(qdmPatients);
      const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // No results will be in the episode_results
      expect(result['episode_results']).toEqual({});
      // The IPP should be the only relevant population
      expect(result.extendedData['population_relevance']).toEqual({ IPP: true, DENOM: false, DENEX: false, NUMER: false });
    });

    it('is correct for patient with episodes', function() {
      const valueSetsByOid = getJSONFixture('measures/CMS107v6/value_sets.json');
      const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json'));
      const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
      const qdmPatients = patients.map(patient => new QDMPatient(patient));
      const qdmPatientsSource = new PatientSource(qdmPatients);
      const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // There will be a single result in the episode_results
      expect(Object.values(result['episode_results'])[0]).toEqual({ IPP: 1, DENOM: 1, DENEX: 1, NUMER: 0 });

      // NUMER should be the only non-relevant population
      expect(result.extendedData['population_relevance']).toEqual({ IPP: true, DENOM: true, DENEX: true, NUMER: false });
    });
  });

  describe('patient based relevance map', function() {
    it('is correct', function() {
      const valueSetsByOid = getJSONFixture('measures/CMS735v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS735v0/CMS735v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS735v0/first_last.json'));
      const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
      const qdmPatients = patients.map(patient => new QDMPatient(patient));
      const qdmPatientsSource = new PatientSource(qdmPatients);
      const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // There will not be episode_results on the result object
      expect(result['episode_results']).toBeUndefined();
      // The IPP should be the only relevant population
      expect(result.extendedData['population_relevance']).toEqual({ IPP: true, DENOM: false, DENEX: false, NUMER: false, DENEXCEP: false});
    });
  });

  describe('measure that uses intersect function', function() {
    it('is correct', function() {
      const valueSetsByOid = getJSONFixture('measures/CMS53v7/value_sets.json');
      const measure = getJSONFixture('measures/CMS53v7/CMS53v7.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS53v7/PCIat60min_NUMERPass.json'));
      const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
      const qdmPatients = patients.map(patient => new QDMPatient(patient));
      const qdmPatientsSource = new PatientSource(qdmPatients);
      const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);

      numerPass = calculationResults[Object.keys(calculationResults)[0]];

      // Patient numerPass Population Set 1
      expect(numerPass['PopulationCriteria1'].IPP).toBe(1);
      expect(numerPass['PopulationCriteria1'].DENOM).toBe(1);
      expect(numerPass['PopulationCriteria1'].DENEX).toBe(0);
      expect(numerPass['PopulationCriteria1'].NUMER).toBe(1);
    });
  });

  describe('execution engine using passed in timezone offset', function() {
    it('is correct', function() {
      const valueSetsByOid = getJSONFixture('measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json'));
      const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
      const qdmPatients = patients.map(patient => new QDMPatient(patient));
      const qdmPatientsSource = new PatientSource(qdmPatients);
      const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The IPP should fail
      expect(result.IPP).toEqual(0);
    });
  });

  it('multiple population measure correctly', function() {
    const valueSetsByOid = getJSONFixture('measures/CMS160v6/value_sets.json');
    const measure = getJSONFixture('measures/CMS160v6/CMS160v6.json');
    const expiredDenex = getJSONFixture('patients/CMS160v6/Expired_DENEX.json');
    const passNumer2 = getJSONFixture('patients/CMS160v6/Pass_NUM2.json');
    const patients = [];
    patients.push(expiredDenex);
    patients.push(passNumer2);
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
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

  xit('does not drop any fields when calling JSON.stringify', function() {
    const valueSetsByOid = getJSONFixture('measures/CMS32v7/value_sets.json');
    const measure = getJSONFixture('measures/CMS32v7/CMS32v7.json');
    const p1 = getJSONFixture('patients/CMS32v7/Visit_1ED.json');
    const p2 = getJSONFixture('patients/CMS32v7/Visits_1Excl_2ED.json');
    const p3 = getJSONFixture('patients/CMS32v7/Visits_2ED.json');
    const p4 = getJSONFixture('patients/CMS32v7/Visits_2Excl_2ED.json');
    const patients = [];
    patients.push(p1);
    patients.push(p2);
    patients.push(p3);
    patients.push(p4);
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid, {doPretty: true});
    stringifiedResults = JSON.parse(JSON.stringify(calculationResults));
    // TODO: verify the stringified version has everything we need
  });

  it('multiple observation measure correctly', function() {
    const valueSetsByOid = getJSONFixture('measures/CMS32v7/value_sets.json');
    const measure = getJSONFixture('measures/CMS32v7/CMS32v7.json');
    const visit2Ed = getJSONFixture('patients/CMS32v7/Visits_2ED.json');
    const visit1Ed = getJSONFixture('patients/CMS32v7/Visit_1ED.json');
    const visit1excl = getJSONFixture('patients/CMS32v7/Visits_1Excl_2ED.json');
    const visit2excl = getJSONFixture('patients/CMS32v7/Visits_2Excl_2ED.json');
    const patients = [];
    patients.push(visit1Ed);
    patients.push(visit2Ed);
    patients.push(visit1excl);
    patients.push(visit2excl);
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);

    calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
    visit1EdResults = calculationResults[Object.keys(calculationResults)[0]];
    visit2EdResults = calculationResults[Object.keys(calculationResults)[1]];
    visit1exclResults = calculationResults[Object.keys(calculationResults)[2]];
    visit2exclResults = calculationResults[Object.keys(calculationResults)[3]];

    // Patient visit1EdResults Population Set 1
    expect(visit1EdResults['PopulationCriteria1'].IPP).toBe(1);
    expect(visit1EdResults['PopulationCriteria1'].MSRPOPL).toBe(1);
    expect(visit1EdResults['PopulationCriteria1'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit1EdResults['PopulationCriteria1'].episode_results)).toEqual([15]);
    // Patient visit1EdResults Population Set 1 Stratification 1
    expect(visit1EdResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(1);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(1);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 1'].MSRPOPL).toBe(1);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 1'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit1EdResults['PopulationCriteria1 - Stratification 1'].episode_results)).toEqual([15]);
    // Patient visit1EdResults Population Set 1 Stratification 2
    expect(visit1EdResults['PopulationCriteria1 - Stratification 2'].STRAT).toBe(0);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(0);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 2'].MSRPOPL).toBe(0);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 2'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit1EdResults['PopulationCriteria1 - Stratification 2'].episode_results)).toEqual([]);
    // Patient visit1EdResults Population Set 1 Stratification 3
    expect(visit1EdResults['PopulationCriteria1 - Stratification 3'].STRAT).toBe(0);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 3'].IPP).toBe(0);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 3'].MSRPOPL).toBe(0);
    expect(visit1EdResults['PopulationCriteria1 - Stratification 3'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit1EdResults['PopulationCriteria1 - Stratification 3'].episode_results)).toEqual([]);

    // Patient visit2EdResults Population Set 1
    expect(visit2EdResults['PopulationCriteria1'].IPP).toBe(2);
    expect(visit2EdResults['PopulationCriteria1'].MSRPOPL).toBe(2);
    expect(visit2EdResults['PopulationCriteria1'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit2EdResults['PopulationCriteria1'].episode_results)).toEqual([15, 25]);
    // Patient visit2EdResults Population Set 1 Stratification 1
    expect(visit2EdResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(2);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(2);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 1'].MSRPOPL).toBe(2);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 1'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit2EdResults['PopulationCriteria1 - Stratification 1'].episode_results)).toEqual([15, 25]);
    // Patient visit2EdResults Population Set 1 Stratification 2
    expect(visit2EdResults['PopulationCriteria1 - Stratification 2'].STRAT).toBe(0);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(0);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 2'].MSRPOPL).toBe(0);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 2'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit2EdResults['PopulationCriteria1 - Stratification 2'].episode_results)).toEqual([]);
    // Patient visit2EdResults Population Set 1 Stratification 3
    expect(visit2EdResults['PopulationCriteria1 - Stratification 3'].STRAT).toBe(0);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 3'].IPP).toBe(0);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 3'].MSRPOPL).toBe(0);
    expect(visit2EdResults['PopulationCriteria1 - Stratification 3'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit2EdResults['PopulationCriteria1 - Stratification 3'].episode_results)).toEqual([]);

    // Patient visit1exclResults Population Set 1
    expect(visit1exclResults['PopulationCriteria1'].IPP).toBe(2);
    expect(visit1exclResults['PopulationCriteria1'].MSRPOPL).toBe(2);
    expect(visit1exclResults['PopulationCriteria1'].MSRPOPLEX).toBe(1);
    expect(getEpisodeResults(visit1exclResults['PopulationCriteria1'].episode_results)).toEqual([25]);
    // Patient visit1exclResults Population Set 1 Stratification 1
    expect(visit1exclResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(2);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(2);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 1'].MSRPOPL).toBe(2);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 1'].MSRPOPLEX).toBe(1);
    expect(getEpisodeResults(visit1exclResults['PopulationCriteria1 - Stratification 1'].episode_results)).toEqual([25]);
    // Patient visit1exclResults Population Set 1 Stratification 2
    expect(visit1exclResults['PopulationCriteria1 - Stratification 2'].STRAT).toBe(0);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(0);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 2'].MSRPOPL).toBe(0);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 2'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit1exclResults['PopulationCriteria1 - Stratification 2'].episode_results)).toEqual([]);
    // Patient visit1exclResults Population Set 1 Stratification 3
    expect(visit1exclResults['PopulationCriteria1 - Stratification 3'].STRAT).toBe(0);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 3'].IPP).toBe(0);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 3'].MSRPOPL).toBe(0);
    expect(visit1exclResults['PopulationCriteria1 - Stratification 3'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit1exclResults['PopulationCriteria1 - Stratification 3'].episode_results)).toEqual([]);

    // Patient visit2exclResults Population Set 1
    expect(visit2exclResults['PopulationCriteria1'].IPP).toBe(2);
    expect(visit2exclResults['PopulationCriteria1'].MSRPOPL).toBe(2);
    expect(visit2exclResults['PopulationCriteria1'].MSRPOPLEX).toBe(2);
    expect(getEpisodeResults(visit2exclResults['PopulationCriteria1'].episode_results)).toEqual([]);
    // Patient visit2exclResults Population Set 1 Stratification 1
    expect(visit2exclResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(2);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(2);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 1'].MSRPOPL).toBe(2);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 1'].MSRPOPLEX).toBe(2);
    expect(getEpisodeResults(visit2exclResults['PopulationCriteria1 - Stratification 1'].episode_results)).toEqual([]);
    // Patient visit2exclResults Population Set 1 Stratification 2
    expect(visit2exclResults['PopulationCriteria1 - Stratification 2'].STRAT).toBe(0);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(0);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 2'].MSRPOPL).toBe(0);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 2'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit2exclResults['PopulationCriteria1 - Stratification 2'].episode_results)).toEqual([]);
    // Patient visit2exclResults Population Set 1 Stratification 3
    expect(visit2exclResults['PopulationCriteria1 - Stratification 3'].STRAT).toBe(0);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 3'].IPP).toBe(0);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 3'].MSRPOPL).toBe(0);
    expect(visit2exclResults['PopulationCriteria1 - Stratification 3'].MSRPOPLEX).toBe(0);
    expect(getEpisodeResults(visit2exclResults['PopulationCriteria1 - Stratification 3'].episode_results)).toEqual([]);


    // Check Statement Relevance for Population Criteria 1
    expect(visit1EdResults.PopulationCriteria1.extendedData.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
      "ED Visit":"TRUE",
      "Initial Population":"TRUE",
      "Measure Observation":"TRUE",
      "Measure Population":"TRUE",
      "Measure Population Exclusions":"TRUE",
      "Patient":"NA",
      "SDE Ethnicity":"NA",
      "SDE Payer":"NA",
      "SDE Race":"NA",
      "SDE Sex":"NA",
      "Stratification 1":"NA",
      "Stratification 2":"NA",
      "Stratification 3":"NA"
    });

    // Check Statement Relevance for Population Set 1 Stratification 1
    expect(visit1EdResults['PopulationCriteria1 - Stratification 1'].extendedData.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
      "ED Visit":"TRUE",
      "Initial Population":"TRUE",
      "Measure Observation":"TRUE",
      "Measure Population":"TRUE",
      "Measure Population Exclusions":"TRUE",
      "Patient":"NA",
      "SDE Ethnicity":"NA",
      "SDE Payer":"NA",
      "SDE Race":"NA",
      "SDE Sex":"NA",
      "Stratification 1":"TRUE",
      "Stratification 2":"NA",
      "Stratification 3":"NA"
    });


    // Check Statement Relevance for Population Set 1 Stratification 2
    expect(visit1EdResults['PopulationCriteria1 - Stratification 2'].extendedData.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
      "ED Visit":"TRUE",
      "Initial Population":"FALSE",
      "Measure Observation":"FALSE",
      "Measure Population":"FALSE",
      "Measure Population Exclusions":"FALSE",
      "Patient":"NA",
      "SDE Ethnicity":"NA",
      "SDE Payer":"NA",
      "SDE Race":"NA",
      "SDE Sex":"NA",
      "Stratification 1":"NA",
      "Stratification 2":"TRUE",
      "Stratification 3":"NA"
    })

    // Check Statement Relevance for Population Set 1 Stratification 3
    expect(visit1EdResults['PopulationCriteria1 - Stratification 3'].extendedData.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
      "ED Visit":"TRUE",
      "Initial Population":"FALSE",
      "Measure Observation":"FALSE",
      "Measure Population":"FALSE",
      "Measure Population Exclusions":"FALSE",
      "Patient":"NA",
      "SDE Ethnicity":"NA",
      "SDE Payer":"NA",
      "SDE Race":"NA",
      "SDE Sex":"NA",
      "Stratification 1":"NA",
      "Stratification 2":"NA",
      "Stratification 3":"TRUE"
    })
  });

  it('single population EOC measure correctly', function() {
    const valueSetsByOid = getJSONFixture('measures/CMS177v6/value_sets.json');
    const measure = getJSONFixture('measures/CMS177v6/CMS177v6.json');
    const failIPP = getJSONFixture('patients/CMS177v6/Fail_IPP.json');
    const passNumer = getJSONFixture('patients/CMS177v6/Pass_Numer.json');
    const patients = [];
    patients.push(failIPP);
    patients.push(passNumer);
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
    failIPPResults = calculationResults[Object.keys(calculationResults)[0]];
    passNumerResults = calculationResults[Object.keys(calculationResults)[1]];

    // Patient failIPP Population Set 1
    expect(failIPPResults['PopulationCriteria1'].IPP).toBe(0);
    expect(failIPPResults['PopulationCriteria1'].DENOM).toBe(0);
    expect(failIPPResults['PopulationCriteria1'].NUMER).toBe(0);

    // Patient passNumer Population Set 1
    expect(passNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].NUMER).toBe(1);
  });

  it('single population patient-based measure correctly', function() {
    const valueSetsByOid = getJSONFixture('measures/CMS134v6/value_sets.json');
    const measure = getJSONFixture('measures/CMS134v6/CMS134v6.json');
    const failHospiceNotPerformedDenex = getJSONFixture('patients/CMS134v6/Fail_Hospice_Not_Performed_Denex.json');
    const passNumer = getJSONFixture('patients/CMS134v6/Pass_Numer.json');
    const patients = [];
    patients.push(failHospiceNotPerformedDenex);
    patients.push(passNumer);
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
    failHospiceNotPerformedDenexResults = calculationResults[Object.keys(calculationResults)[0]];
    passNumerResults = calculationResults[Object.keys(calculationResults)[1]];

    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].IPP).toBe(1);
    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].DENEX).toBe(0);
    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].NUMER).toBe(0);

    expect(passNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].DENEX).toBe(0);
    expect(passNumerResults['PopulationCriteria1'].NUMER).toBe(1);
  });

  it('measure that calculates supplemental data elements correctly', function() {
    const valueSetsByOid = getJSONFixture('measures/CMS529v0/value_sets.json');
    const measure = getJSONFixture('measures/CMS529v0/CMS529v0.json');
    const passIppDenomNumer = getJSONFixture('patients/CMS529v0/Pass_IPP-DENOM-NUMER.json');
    const patients = [];
    patients.push(passIppDenomNumer);
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
    passIppDenomNumerResults = calculationResults[Object.keys(calculationResults)[0]];

    expect(passIppDenomNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passIppDenomNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passIppDenomNumerResults['PopulationCriteria1'].NUMER).toBe(1);
  });

  it('multiple populations with multiple stratifications measure correctly', function() {
    const valueSetsByOid = getJSONFixture('measures/CMS137v7/value_sets.json');
    const measure = getJSONFixture('measures/CMS137v7/CMS137v7.json');
    const ippPopFail = getJSONFixture('patients/CMS137v7/2YoungDependence&TX_IPPPopFail.json');
    const denexPop18StratPass = getJSONFixture('patients/CMS137v7/Dependency<60daysSB4_DENEXPop>18StratPass.json');
    const pop1_1318Pass = getJSONFixture('patients/CMS137v7/Therapy<14DaysDx_NUMERPop1_13-18Pass.json');
    const patients = [];
    patients.push(ippPopFail);
    patients.push(denexPop18StratPass);
    patients.push(pop1_1318Pass);
    QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    qdmPatients = patients.map(patient => new QDMPatient(patient));
    qdmPatientsSource = new PatientSource(qdmPatients);
    calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);

    ippPopFailResults = calculationResults[Object.keys(calculationResults)[0]];
    denexPop18StratPassResults = calculationResults[Object.keys(calculationResults)[1]];
    pop1_1318PassResults = calculationResults[Object.keys(calculationResults)[2]];

    // Patient ippPopFail results
    expect(ippPopFailResults['PopulationCriteria1'].IPP).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1'].DENOM).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1'].NUMER).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1'].DENEX).toBe(0);

    expect(ippPopFailResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1 - Stratification 1'].DENOM).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1 - Stratification 1'].NUMER).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1 - Stratification 1'].DENEX).toBe(0);

    expect(ippPopFailResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1 - Stratification 2'].DENOM).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1 - Stratification 2'].NUMER).toBe(0);
    expect(ippPopFailResults['PopulationCriteria1 - Stratification 2'].DENEX).toBe(0);

    expect(ippPopFailResults['PopulationCriteria2'].IPP).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2'].DENOM).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2'].NUMER).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2'].DENEX).toBe(0);

    expect(ippPopFailResults['PopulationCriteria2 - Stratification 1'].IPP).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2 - Stratification 1'].DENOM).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2 - Stratification 1'].NUMER).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2 - Stratification 1'].DENEX).toBe(0);

    expect(ippPopFailResults['PopulationCriteria2 - Stratification 2'].IPP).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2 - Stratification 2'].DENOM).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2 - Stratification 2'].NUMER).toBe(0);
    expect(ippPopFailResults['PopulationCriteria2 - Stratification 2'].DENEX).toBe(0);

    // Patient denexPop18StratPassResults
    expect(denexPop18StratPassResults['PopulationCriteria1'].IPP).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria1'].NUMER).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria1'].DENEX).toBe(1);

    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 1'].DENOM).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 1'].NUMER).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 1'].DENEX).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(0);

    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 2'].DENOM).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 2'].NUMER).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 2'].DENEX).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria1 - Stratification 2'].STRAT).toBe(1);

    expect(denexPop18StratPassResults['PopulationCriteria2'].IPP).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria2'].DENOM).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria2'].NUMER).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria2'].DENEX).toBe(1);

    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 1'].IPP).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 1'].DENOM).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 1'].NUMER).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 1'].DENEX).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 1'].STRAT).toBe(0);

    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 2'].IPP).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 2'].DENOM).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 2'].NUMER).toBe(0);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 2'].DENEX).toBe(1);
    expect(denexPop18StratPassResults['PopulationCriteria2 - Stratification 2'].STRAT).toBe(1);


    // Patient pop1_1318PassResults
    expect(pop1_1318PassResults['PopulationCriteria1'].IPP).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria1'].NUMER).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria1'].DENEX).toBe(0);

    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 1'].DENOM).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 1'].NUMER).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 1'].DENEX).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(1);

    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 2'].DENOM).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 2'].NUMER).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 2'].DENEX).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 2'].STRAT).toBe(0);

    expect(pop1_1318PassResults['PopulationCriteria2'].IPP).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria2'].DENOM).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria2'].NUMER).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria2'].DENEX).toBe(0);

    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 1'].IPP).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 1'].DENOM).toBe(1);
    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 1'].NUMER).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 1'].DENEX).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(1);

    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 2'].IPP).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 2'].DENOM).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 2'].NUMER).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 2'].DENEX).toBe(0);
    expect(pop1_1318PassResults['PopulationCriteria2 - Stratification 2'].STRAT).toBe(0);
  });
});
