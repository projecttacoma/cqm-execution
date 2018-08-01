/* eslint dot-notation: 0 */ // --> OFF
/* eslint quote-props: 0 */ // --> OFF

const Calculator = require('../../lib/models/calculator.js');
const getJSONFixture = require('../support/spec_helper.js').getJSONFixture;
const getEpisodeResults = require('../support/spec_helper.js').getEpisodeResults;

describe('Calculator', () => {
  describe('episode of care based relevance map', () => {
    it('is correct for patient with no episodes', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS107v6/value_sets.json');
      const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS107v6/IPPFail_LOS=121Days.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // No results will be in the episode_results
      expect(result['episode_results']).toEqual({});
      // The IPP should be the only relevant population
      expect(result.extendedData['population_relevance']).toEqual({
        IPP: true, DENOM: false, DENEX: false, NUMER: false,
      });
    });

    it('is correct for patient with episodes', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS107v6/value_sets.json');
      const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // There will be a single result in the episode_results
      expect(Object.values(result['episode_results'])[0]).toEqual({
        IPP: 1, DENOM: 1, DENEX: 1, NUMER: 0,
      });

      // NUMER should be the only non-relevant population
      expect(result.extendedData['population_relevance']).toEqual({
        IPP: true, DENOM: true, DENEX: true, NUMER: false,
      });
    });
  });

  describe('patient based relevance map', () => {
    it('is correct', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS735v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS735v0/CMS735v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS735v0/first_last.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // There will not be episode_results on the result object
      expect(result['episode_results']).toBeUndefined();
      // The IPP should be the only relevant population
      expect(result.extendedData['population_relevance']).toEqual({
        IPP: true, DENOM: false, DENEX: false, NUMER: false, DENEXCEP: false,
      });
    });
  });

  describe('measure that uses intersect function ', () => {
    it('is correct', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS53v7/value_sets.json');
      const measure = getJSONFixture('measures/CMS53v7/CMS53v7.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS53v7/PCIat60min_NUMERPass.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
      const numerPass = calculationResults[Object.keys(calculationResults)[0]];

      // Patient numerPass Population Set 1
      expect(numerPass['PopulationCriteria1'].IPP).toBe(1);
      expect(numerPass['PopulationCriteria1'].DENOM).toBe(1);
      expect(numerPass['PopulationCriteria1'].DENEX).toBe(0);
      expect(numerPass['PopulationCriteria1'].NUMER).toBe(1);
    });
  });

  describe('execution engine using default timezone offset', () => {
    it('is correct', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The IPP should not be in the IPP
      expect(result.IPP).toEqual(0);
    });
  });

  describe('execution engine using passed in timezone offset', () => {
    it('is correct', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid, { timezoneOffset: -4 });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The patient should be in the IPP now that the end of the measure period is 4 hours in the future
      expect(result.IPP).toEqual(1);
    });
  });

  describe('execution engine using passed in timezone offset and good effective_date', () => {
    it('is correct', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid, { effectiveDate: '201201010000', timezoneOffset: -4 });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The patient should be in the IPP now that the end of the measure period is 4 hours in the future
      expect(result.IPP).toEqual(1);
    });
  });

  describe('execution engine using passed in timezone offset and bad effective_date', () => {
    it('is correct', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid, { effective_date: '201701010000', timezone_offset: -4 });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The patient should be in the IPP now that the end of the measure period is 4 hours in the future
      expect(result.IPP).toEqual(0);
    });
  });

  it('multiple population measure correctly', () => {
    const valueSetsByOid = getJSONFixture('measures/CMS160v6/value_sets.json');
    const measure = getJSONFixture('measures/CMS160v6/CMS160v6.json');
    const expiredDenex = getJSONFixture('patients/CMS160v6/Expired_DENEX.json');
    const passNumer2 = getJSONFixture('patients/CMS160v6/Pass_NUM2.json');
    const patients = [];
    patients.push(expiredDenex);
    patients.push(passNumer2);
    const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
    const expiredDenexResults = calculationResults[Object.keys(calculationResults)[0]];
    const passNumer2Results = calculationResults[Object.keys(calculationResults)[1]];

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

  it('multiple observation measure correctly', () => {
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

    const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
    const visit1EdResults = calculationResults[Object.keys(calculationResults)[0]];
    const visit2EdResults = calculationResults[Object.keys(calculationResults)[1]];
    const visit1exclResults = calculationResults[Object.keys(calculationResults)[2]];
    const visit2exclResults = calculationResults[Object.keys(calculationResults)[3]];

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
      'ED Visit': 'TRUE',
      'Initial Population': 'TRUE',
      'Measure Observation': 'TRUE',
      'Measure Population': 'TRUE',
      'Measure Population Exclusions': 'TRUE',
      'Patient': 'NA',
      'SDE Ethnicity': 'NA',
      'SDE Payer': 'NA',
      'SDE Race': 'NA',
      'SDE Sex': 'NA',
      'Stratification 1': 'NA',
      'Stratification 2': 'NA',
      'Stratification 3': 'NA',
    });

    // Check Statement Relevance for Population Set 1 Stratification 1
    expect(visit1EdResults['PopulationCriteria1 - Stratification 1'].extendedData.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
      'ED Visit': 'TRUE',
      'Initial Population': 'TRUE',
      'Measure Observation': 'TRUE',
      'Measure Population': 'TRUE',
      'Measure Population Exclusions': 'TRUE',
      'Patient': 'NA',
      'SDE Ethnicity': 'NA',
      'SDE Payer': 'NA',
      'SDE Race': 'NA',
      'SDE Sex': 'NA',
      'Stratification 1': 'TRUE',
      'Stratification 2': 'NA',
      'Stratification 3': 'NA',
    });


    // Check Statement Relevance for Population Set 1 Stratification 2
    expect(visit1EdResults['PopulationCriteria1 - Stratification 2'].extendedData.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
      'ED Visit': 'TRUE',
      'Initial Population': 'FALSE',
      'Measure Observation': 'FALSE',
      'Measure Population': 'FALSE',
      'Measure Population Exclusions': 'FALSE',
      'Patient': 'NA',
      'SDE Ethnicity': 'NA',
      'SDE Payer': 'NA',
      'SDE Race': 'NA',
      'SDE Sex': 'NA',
      'Stratification 1': 'NA',
      'Stratification 2': 'TRUE',
      'Stratification 3': 'NA',
    });

    // Check Statement Relevance for Population Set 1 Stratification 3
    expect(visit1EdResults['PopulationCriteria1 - Stratification 3'].extendedData.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
      'ED Visit': 'TRUE',
      'Initial Population': 'FALSE',
      'Measure Observation': 'FALSE',
      'Measure Population': 'FALSE',
      'Measure Population Exclusions': 'FALSE',
      'Patient': 'NA',
      'SDE Ethnicity': 'NA',
      'SDE Payer': 'NA',
      'SDE Race': 'NA',
      'SDE Sex': 'NA',
      'Stratification 1': 'NA',
      'Stratification 2': 'NA',
      'Stratification 3': 'TRUE',
    });
  });

  it('single population EOC measure correctly', () => {
    const valueSetsByOid = getJSONFixture('measures/CMS177v6/value_sets.json');
    const measure = getJSONFixture('measures/CMS177v6/CMS177v6.json');
    const failIPP = getJSONFixture('patients/CMS177v6/Fail_IPP.json');
    const passNumer = getJSONFixture('patients/CMS177v6/Pass_Numer.json');
    const patients = [];
    patients.push(failIPP);
    patients.push(passNumer);
    const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
    const failIPPResults = calculationResults[Object.keys(calculationResults)[0]];
    const passNumerResults = calculationResults[Object.keys(calculationResults)[1]];

    // Patient failIPP Population Set 1
    expect(failIPPResults['PopulationCriteria1'].IPP).toBe(0);
    expect(failIPPResults['PopulationCriteria1'].DENOM).toBe(0);
    expect(failIPPResults['PopulationCriteria1'].NUMER).toBe(0);

    // Patient passNumer Population Set 1
    expect(passNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].NUMER).toBe(1);
  });

  it('single population patient-based measure correctly', () => {
    const valueSetsByOid = getJSONFixture('measures/CMS134v6/value_sets.json');
    const measure = getJSONFixture('measures/CMS134v6/CMS134v6.json');
    const failHospiceNotPerformedDenex = getJSONFixture('patients/CMS134v6/Fail_Hospice_Not_Performed_Denex.json');
    const passNumer = getJSONFixture('patients/CMS134v6/Pass_Numer.json');
    const patients = [];
    patients.push(failHospiceNotPerformedDenex);
    patients.push(passNumer);
    const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
    const failHospiceNotPerformedDenexResults = calculationResults[Object.keys(calculationResults)[0]];
    const passNumerResults = calculationResults[Object.keys(calculationResults)[1]];

    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].IPP).toBe(1);
    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].DENEX).toBe(0);
    expect(failHospiceNotPerformedDenexResults['PopulationCriteria1'].NUMER).toBe(0);

    expect(passNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passNumerResults['PopulationCriteria1'].DENEX).toBe(0);
    expect(passNumerResults['PopulationCriteria1'].NUMER).toBe(1);
  });

  it('measure that calculates supplemental data elements correctly', () => {
    const valueSetsByOid = getJSONFixture('measures/CMS529v0/value_sets.json');
    const measure = getJSONFixture('measures/CMS529v0/CMS529v0.json');
    const passIppDenomNumer = getJSONFixture('patients/CMS529v0/Pass_IPP-DENOM-NUMER.json');
    const patients = [];
    patients.push(passIppDenomNumer);
    const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);
    const passIppDenomNumerResults = calculationResults[Object.keys(calculationResults)[0]];

    expect(passIppDenomNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passIppDenomNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passIppDenomNumerResults['PopulationCriteria1'].NUMER).toBe(1);
  });

  it('multiple populations with multiple stratifications measure correctly', () => {
    const valueSetsByOid = getJSONFixture('measures/CMS137v7/value_sets.json');
    const measure = getJSONFixture('measures/CMS137v7/CMS137v7.json');
    const ippPopFail = getJSONFixture('patients/CMS137v7/2YoungDependence&TX_IPPPopFail.json');
    const denexPop18StratPass = getJSONFixture('patients/CMS137v7/Dependency<60daysSB4_DENEXPop>18StratPass.json');
    const pop1Pass = getJSONFixture('patients/CMS137v7/Therapy<14DaysDx_NUMERPop1_13-18Pass.json');
    const patients = [];
    patients.push(ippPopFail);
    patients.push(denexPop18StratPass);
    patients.push(pop1Pass);
    const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid);

    const ippPopFailResults = calculationResults[Object.keys(calculationResults)[0]];
    const denexPop18StratPassResults = calculationResults[Object.keys(calculationResults)[1]];
    const pop1PassResults = calculationResults[Object.keys(calculationResults)[2]];

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


    // Patient pop1PassResults
    expect(pop1PassResults['PopulationCriteria1'].IPP).toBe(1);
    expect(pop1PassResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(pop1PassResults['PopulationCriteria1'].NUMER).toBe(1);
    expect(pop1PassResults['PopulationCriteria1'].DENEX).toBe(0);

    expect(pop1PassResults['PopulationCriteria1 - Stratification 1'].IPP).toBe(1);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 1'].DENOM).toBe(1);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 1'].NUMER).toBe(1);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 1'].DENEX).toBe(0);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(1);

    expect(pop1PassResults['PopulationCriteria1 - Stratification 2'].IPP).toBe(0);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 2'].DENOM).toBe(0);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 2'].NUMER).toBe(0);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 2'].DENEX).toBe(0);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 2'].STRAT).toBe(0);

    expect(pop1PassResults['PopulationCriteria2'].IPP).toBe(1);
    expect(pop1PassResults['PopulationCriteria2'].DENOM).toBe(1);
    expect(pop1PassResults['PopulationCriteria2'].NUMER).toBe(0);
    expect(pop1PassResults['PopulationCriteria2'].DENEX).toBe(0);

    expect(pop1PassResults['PopulationCriteria2 - Stratification 1'].IPP).toBe(1);
    expect(pop1PassResults['PopulationCriteria2 - Stratification 1'].DENOM).toBe(1);
    expect(pop1PassResults['PopulationCriteria2 - Stratification 1'].NUMER).toBe(0);
    expect(pop1PassResults['PopulationCriteria2 - Stratification 1'].DENEX).toBe(0);
    expect(pop1PassResults['PopulationCriteria1 - Stratification 1'].STRAT).toBe(1);

    expect(pop1PassResults['PopulationCriteria2 - Stratification 2'].IPP).toBe(0);
    expect(pop1PassResults['PopulationCriteria2 - Stratification 2'].DENOM).toBe(0);
    expect(pop1PassResults['PopulationCriteria2 - Stratification 2'].NUMER).toBe(0);
    expect(pop1PassResults['PopulationCriteria2 - Stratification 2'].DENEX).toBe(0);
    expect(pop1PassResults['PopulationCriteria2 - Stratification 2'].STRAT).toBe(0);
  });

  describe('opioid measure', () => {
    it('results have correct indentation', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS460v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS460v0/CMS460v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS460v0/Opioid_Test.json'));
      const options = { doPretty: true };
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid, options);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
      const indentedResult = '[{' +
      '\n  period: Interval: 05/09/2012 8:00 AM - 12/28/2012 8:15 AM,' +
      '\n  meds: [Medication, Order: Opioid Medications' +
      '\n        START: 05/09/2012 8:00 AM' +
      '\n        STOP: 12/28/2012 8:15 AM' +
      '\n        CODE: RxNorm 1053647],' +
      '\n  cmd: 233' +
      '\n}]';

      expect(result.statement_results['PotentialOpioidOveruse']['Periods With and Without 7 Day Gap With Cumulative Med Duration 90 days or Greater']['pretty']).toEqual(indentedResult);
    });
  });

  describe('results include clause results', () => {
    it('only if requested', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('measures/CMS760v0/CMS760v0.json');
      const patients = [getJSONFixture('patients/CMS760v0/Correct_Timezone.json')];
      const calculationResultsNoClauses = Calculator.calculate(measure, patients, valueSetsByOid, { includeClauseResults: false });
      const resultNoClauses = Object.values(calculationResultsNoClauses[Object.keys(calculationResultsNoClauses)[0]])[0];

      const calculationResultsWithClauses = Calculator.calculate(measure, patients, valueSetsByOid, { includeClauseResults: true });
      const resultWithClauses = Object.values(calculationResultsWithClauses[Object.keys(calculationResultsWithClauses)[0]])[0];

      expect(resultNoClauses.clause_results).toEqual(null);
      expect(resultWithClauses.clause_results).toEqual(jasmine.any(Object));
    });
  });

  describe('patient characteristics', () => {
    it('calculate and display correctly', () => {
      const valueSetsByOid = getJSONFixture('measures/CMS123v7/value_sets.json');
      const measure = getJSONFixture('measures/CMS123v7/CMS123v7.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS123v7/Test_PatientCharacteristic.json'));
      const options = { doPretty: true };
      const calculationResults = Calculator.calculate(measure, patients, valueSetsByOid, options);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The expected strings are from the front end with PatientCharacteristic CODEs fixed
      expect(result['statement_results']['DiabetesFootExam']['SDE Ethnicity']['pretty']).toEqual('[PatientCharacteristicEthnicity\nCODE: CDC Race 2186-5]');
      const expectedPayer = '[Patient Characteristic Payer: Payer\nSTART: 07/25/2012 8:00 AM\nSTOP: 07/25/2012 8:15 AM\nCODE: Source of Payment Typology 1]';
      expect(result['statement_results']['DiabetesFootExam']['SDE Payer']['pretty']).toEqual(expectedPayer);
      expect(result['statement_results']['DiabetesFootExam']['SDE Race']['pretty']).toEqual('[PatientCharacteristicRace\nCODE: CDC Race 1002-5]');
      expect(result['statement_results']['DiabetesFootExam']['SDE Sex']['pretty']).toEqual('[PatientCharacteristicSex\nCODE: AdministrativeGender M]');
    });
  });
});
