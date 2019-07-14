/* eslint dot-notation: 0 */ // --> OFF
/* eslint quote-props: 0 */ // --> OFF

const Calculator = require('../../lib/models/calculator.js');
const getJSONFixture = require('../support/spec_helper.js').getJSONFixture;
const getEpisodeResults = require('../support/spec_helper.js').getEpisodeResults;
const CqmModels = require('cqm-models');

describe('Calculator', () => {
  describe('episode of care based relevance map', () => {
    it('is correct for patient with no episodes', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS107v6/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS107v6/CMS107v6.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS107v6/IPPFail_LOS=121Days.json').qdmPatient);
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // No results will be in the episode_results
      expect(result['episode_results']).toEqual({});
      // The IPP should be the only relevant population
      expect(result.population_relevance).toEqual({
        IPP: true, DENOM: false, DENEX: false, NUMER: false,
      });
    });

    xit('is correct for patient with episodes', () => {
      // TODO: Find another measure to use. PrincipalDiagnosis is no longer a QDM attribute and is used in this measure logic
      const valueSets = getJSONFixture('cqm_measures/CMS107v6/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS107v6/CMS107v6.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json').qdmPatient);
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // There will be a single result in the episode_results
      expect(Object.values(result['episode_results'])[0]).toEqual({
        IPP: 1, DENOM: 1, DENEX: 1, NUMER: 0,
      });

      // NUMER should be the only non-relevant population
      expect(result.population_relevance).toEqual({
        IPP: true, DENOM: true, DENEX: true, NUMER: false,
      });
    });
  });

  describe('patient based relevance map', () => {
    it('is correct', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS735v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS735v0/CMS735v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS735v0/first_last.json'));
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // There will not be episode_results on the result object
      expect(result['episode_results']).toBeUndefined();
      // The IPP should be the only relevant population
      expect(result.population_relevance).toEqual({
        IPP: true, DENOM: false, DENEX: false, NUMER: false, DENEXCEP: false,
      });
    });
  });

  describe('measure that uses intersect function ', () => {
    xit('is correct', () => {
      // TODO: Find another measure to use. PrincipalDiagnosis is no longer a QDM attribute and is used in this measure logic
      const valueSets = getJSONFixture('cqm_measures/CMS53v7/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS53v7/CMS53v7.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS53v7/PCIat60min_NUMERPass.json').qdmPatient);
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
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
      const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json').qdmPatient);
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The IPP should not be in the IPP
      expect(result.IPP).toEqual(0);
    });
  });

  describe('execution engine using passed in timezone offset', () => {
    xit('is correct', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json').qdmPatient);
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { timezoneOffset: -4, requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The patient should be in the IPP now that the end of the measure period is 4 hours in the future
      expect(result.IPP).toEqual(1);
    });
  });

  describe('execution engine using passed in timezone offset and good effective_date', () => {
    xit('is correct', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json').qdmPatient);
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { effectiveDate: '201201010000', timezoneOffset: -4, requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The patient should be in the IPP now that the end of the measure period is 4 hours in the future
      expect(result.IPP).toEqual(1);
    });
  });

  describe('execution engine using passed in timezone offset and bad effective_date', () => {
    it('is correct', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json').qdmPatient);
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { effective_date: '201701010000', timezone_offset: -4, requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The patient should be in the IPP now that the end of the measure period is 4 hours in the future
      expect(result.IPP).toEqual(0);
    });
  });

  it('multiple population measure correctly', () => {
    const valueSets = getJSONFixture('cqm_measures/CMS160v6/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS160v6/CMS160v6.json');
    const expiredDenex = getJSONFixture('patients/CMS160v6/Expired_DENEX.json');
    const passNumer2 = getJSONFixture('patients/CMS160v6/Pass_NUM2.json');
    const patients = [];
    patients.push(expiredDenex.qdmPatient);
    patients.push(passNumer2.qdmPatient);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
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

  it('multiple population and stratification measure correctly', () => {
    const valueSets = getJSONFixture('cqm_measures/CMS160v7/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS160v7/CMS160v7.json');
    const numPass = getJSONFixture('patients/CMS160v7/PHQ9EBEDec_PerDzDxSAEDec_NUM1Pass.json');
    const patients = [];
    patients.push(numPass.qdmPatient);
    const options = { doPretty: true, requestDocument: true };
    const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
    const numPassResults = calculationResults[Object.keys(calculationResults)[0]];

    // Patient expiredDenexResults Population Set 1
    const pop2Strat1 = numPassResults['PopulationCriteria2'];
    const pop2Strat1StatementResults = pop2Strat1.statement_results_by_statement().DepressionUtilizationofthePHQ9Tool;
    expect(pop2Strat1StatementResults['May through August of Measurement Period'].pretty).toBe('INTERVAL: 05/01/2012 12:00 AM - 09/01/2012 12:00 AM');
  });

  xit('multiple observation measure correctly without mongoose document', () => {
    // TODO: Find another measure to use. PrincipalDiagnosis is no longer a QDM attribute and is used in this measure logic
    const valueSets = getJSONFixture('cqm_measures/CMS32v7/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS32v7/CMS32v7.json');
    const visit2Ed = getJSONFixture('patients/CMS32v7/Visits_2ED.json');
    const visit1Ed = getJSONFixture('patients/CMS32v7/Visit_1ED.json');
    const visit1excl = getJSONFixture('patients/CMS32v7/Visits_1Excl_2ED.json');
    const visit2excl = getJSONFixture('patients/CMS32v7/Visits_2Excl_2ED.json');
    const patients = [];
    patients.push(visit1Ed.qdmPatient);
    patients.push(visit2Ed.qdmPatient);
    patients.push(visit1excl.qdmPatient);
    patients.push(visit2excl.qdmPatient);

    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: false });
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
    expect(visit1EdResults.PopulationCriteria1.statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
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
    expect(visit1EdResults['PopulationCriteria1 - Stratification 1'].statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
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
    expect(visit1EdResults['PopulationCriteria1 - Stratification 2'].statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
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
    expect(visit1EdResults['PopulationCriteria1 - Stratification 3'].statement_relevance.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients).toEqual({
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

  xit('multiple observation measure correctly', () => {
    const valueSets = getJSONFixture('cqm_measures/CMS32v7/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS32v7/CMS32v7.json');
    const visit2Ed = getJSONFixture('patients/CMS32v7/Visits_2ED.json');
    const visit1Ed = getJSONFixture('patients/CMS32v7/Visit_1ED.json');
    const visit1excl = getJSONFixture('patients/CMS32v7/Visits_1Excl_2ED.json');
    const visit2excl = getJSONFixture('patients/CMS32v7/Visits_2Excl_2ED.json');
    const patients = [];
    patients.push(visit1Ed.qdmPatient);
    patients.push(visit2Ed.qdmPatient);
    patients.push(visit1excl.qdmPatient);
    patients.push(visit2excl.qdmPatient);

    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
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

    let statementRelevanceOnly = {};
    let statements = visit1EdResults.PopulationCriteria1.statement_results_by_statement()['MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients'];
    Object.keys(statements).forEach((key) => {
      statementRelevanceOnly[key] = statements[key].relevance;
    });
    // Check Statement Relevance for Population Criteria 1
    expect(statementRelevanceOnly).toEqual({
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

    statements = visit1EdResults['PopulationCriteria1 - Stratification 1'].statement_results_by_statement()['MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients'];
    statementRelevanceOnly = {};
    Object.keys(statements).forEach((key) => {
      statementRelevanceOnly[key] = statements[key].relevance;
    });
    // Check Statement Relevance for Population Set 1 Stratification 1
    expect(statementRelevanceOnly).toEqual({
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

    statements = visit1EdResults['PopulationCriteria1 - Stratification 2'].statement_results_by_statement()['MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients'];
    statementRelevanceOnly = {};
    Object.keys(statements).forEach((key) => {
      statementRelevanceOnly[key] = statements[key].relevance;
    });
    // Check Statement Relevance for Population Set 1 Stratification 2
    expect(statementRelevanceOnly).toEqual({
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

    statements = visit1EdResults['PopulationCriteria1 - Stratification 3'].statement_results_by_statement()['MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients'];
    statementRelevanceOnly = {};
    Object.keys(statements).forEach((key) => {
      statementRelevanceOnly[key] = statements[key].relevance;
    });
    // Check Statement Relevance for Population Set 1 Stratification 3
    expect(statementRelevanceOnly).toEqual({
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


  xit('single population EOC measure correctly', () => {
    // TODO: Find another measure to use. Diagnoses now contains DiagnosesComponents,
    // the measure logic used here asumes Diagnoses is a list of codes
    const valueSets = getJSONFixture('cqm_measures/CMS177v6/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS177v6/CMS177v6.json');
    const failIPP = getJSONFixture('patients/CMS177v6/Fail_IPP.json');
    const passNumer = getJSONFixture('patients/CMS177v6/Pass_Numer.json');
    const patients = [];
    patients.push(failIPP.qdmPatient);
    patients.push(passNumer.qdmPatient);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
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
    const valueSets = getJSONFixture('cqm_measures/CMS134v6/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS134v6/CMS134v6.json');
    const failHospiceNotPerformedDenex = getJSONFixture('patients/CMS134v6/Fail_Hospice_Not_Performed_Denex.json');
    const passNumer = getJSONFixture('patients/CMS134v6/Pass_Numer.json');
    const patients = [];
    patients.push(failHospiceNotPerformedDenex.qdmPatient);
    patients.push(passNumer.qdmPatient);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
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
    const valueSets = getJSONFixture('cqm_measures/CMS529v0/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS529v0/CMS529v0.json');
    const passIppDenomNumer = getJSONFixture('patients/CMS529v0/Pass_IPP-DENOM-NUMER.json');
    const patients = [];
    patients.push(passIppDenomNumer.qdmPatient);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
    const passIppDenomNumerResults = calculationResults[Object.keys(calculationResults)[0]];

    expect(passIppDenomNumerResults['PopulationCriteria1'].IPP).toBe(1);
    expect(passIppDenomNumerResults['PopulationCriteria1'].DENOM).toBe(1);
    expect(passIppDenomNumerResults['PopulationCriteria1'].NUMER).toBe(1);
  });

  it('multiple populations with multiple stratifications measure correctly', () => {
    const valueSets = getJSONFixture('cqm_measures/CMS137v7/value_sets.json');
    const measure = getJSONFixture('cqm_measures/CMS137v7/CMS137v7.json');
    const ippPopFail = getJSONFixture('patients/CMS137v7/2YoungDependence&TX_IPPPopFail.json');
    const denexPop18StratPass = getJSONFixture('patients/CMS137v7/Dependency<60daysSB4_DENEXPop>18StratPass.json');
    const pop1Pass = getJSONFixture('patients/CMS137v7/Therapy<14DaysDx_NUMERPop1_13-18Pass.json');
    const patients = [];
    patients.push(ippPopFail);
    patients.push(denexPop18StratPass);
    patients.push(pop1Pass);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });

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
      const valueSets = getJSONFixture('cqm_measures/CMS460v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS460v0/CMS460v0.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS460v0/Opioid_Test.json').qdmPatient);
      patients.push(getJSONFixture('patients/CMS460v0/MethadoneLessThan90MME_NUMERFail.json').qdmPatient);
      const options = { doPretty: true, requestDocument: true };
      const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
      const conversionFactorResult = Object.values(calculationResults[Object.keys(calculationResults)[1]])[0];
      const indentedResult = '[{' +
      '\n  cmd: 233,' +
      '\n  meds: [Medication, Order: Opioid Medications' +
      '\n        START: 05/09/2012 8:00 AM' +
      '\n        STOP: 12/28/2012 8:15 AM' +
      '\n        CODE: RxNorm 1053647],' +
      '\n  period: INTERVAL: 05/09/2012 8:00 AM - 12/28/2012 8:15 AM' +
      '\n}]';
      const resultsByStatement = result.statement_results_by_statement();
      const conversionFactorResultsByStatement = conversionFactorResult.statement_results_by_statement();

      expect(resultsByStatement['PotentialOpioidOveruse']['Periods With and Without 7 Day Gap With Cumulative Med Duration 90 days or Greater']['pretty']).toEqual(indentedResult);
      expect(conversionFactorResultsByStatement['PotentialOpioidOveruse']['Prescriptions with MME']['pretty']).toContain('conversionFactor: 4,');
    });
  });

  describe('results include clause results', () => {
    it('only if requested with document', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
      const patients = [getJSONFixture('patients/CMS760v0/Correct_Timezone.json')];
      const calculationResultsNoClauses = Calculator.calculate(measure, patients, valueSets, { includeClauseResults: false, requestDocument: true });
      const resultNoClauses = Object.values(calculationResultsNoClauses[Object.keys(calculationResultsNoClauses)[0]])[0];

      const calculationResultsWithClauses = Calculator.calculate(measure, patients, valueSets, { includeClauseResults: true, requestDocument: true });
      const resultWithClauses = Object.values(calculationResultsWithClauses[Object.keys(calculationResultsWithClauses)[0]])[0];

      expect(resultNoClauses.clause_results).toEqual(null);
      expect(resultWithClauses.clause_results).toEqual(jasmine.any(Array));
    });

    it('only if requested without document', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
      const patients = [getJSONFixture('patients/CMS760v0/Correct_Timezone.json')];
      const calculationResultsNoClauses = Calculator.calculate(measure, patients, valueSets, { includeClauseResults: false, requestDocument: false });
      const resultNoClauses = Object.values(calculationResultsNoClauses[Object.keys(calculationResultsNoClauses)[0]])[0];

      const calculationResultsWithClauses = Calculator.calculate(measure, patients, valueSets, { includeClauseResults: true, requestDocument: false });
      const resultWithClauses = Object.values(calculationResultsWithClauses[Object.keys(calculationResultsWithClauses)[0]])[0];

      expect(resultNoClauses.clause_results).toEqual(null);
      expect(resultWithClauses.clause_results).toEqual(jasmine.any(Object));
    });
  });

  describe('patient characteristics', () => {
    it('calculate and display correctly', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS123v7/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS123v7/CMS123v7.json');
      const patients = [];
      patients.push(getJSONFixture('patients/CMS123v7/Test_PatientCharacteristic.json').qdmPatient);

      const options = { doPretty: true, requestDocument: true };
      const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
      const resultsByStatement = result.statement_results_by_statement();

      // The expected strings are from the front end with PatientCharacteristic CODEs fixed
      expect(resultsByStatement['DiabetesFootExam']['SDE Ethnicity']['pretty']).toEqual('[PatientCharacteristicEthnicity\nCODE: CDCREC 2186-5]');
      const expectedPayer = '[Patient Characteristic Payer: Payer\nSTART: 07/25/2012 8:00 AM\nSTOP: 07/25/2012 8:15 AM\nCODE: Source of Payment Typology 1]';
      expect(resultsByStatement['DiabetesFootExam']['SDE Payer']['pretty']).toEqual(expectedPayer);
      expect(resultsByStatement['DiabetesFootExam']['SDE Race']['pretty']).toEqual('[PatientCharacteristicRace\nCODE: CDCREC 1002-5]');
      expect(resultsByStatement['DiabetesFootExam']['SDE Sex']['pretty']).toEqual('[PatientCharacteristicSex\nCODE: AdministrativeGender M]');
    });
  });

  describe('Id objects', () => {
    it('properly calculate and print', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS108v7/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS108v7/CMS108v7.json');
      const patients = [getJSONFixture('patients/CMS108v7/INR4no_decimal_DayOfAnes_NUMERPass.json')];
      const options = { doPretty: true, requestDocument: true };
      const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
      const resultsByStatement = result.statement_results_by_statement();

      const sampleResult = resultsByStatement['VenousThromboembolismProphylaxis']['Is In Low Risk for VTE or On Anticoagulant'];
      const sampleResultId = sampleResult.raw[0].id;
      expect(sampleResult['pretty']).toEqual(`[{\n  authorDatetime: 11/01/2012 10:00 AM,\n  id: "${sampleResultId}"\n}]`);
    });
  });

  describe('Non-Versioned Value-Sets', () => {
    xit('Calculates correctly', () => {
      // TODO: Find another measure to use. PrincipalDiagnosis is no longer a QDM attribute and is used in this measure logic
      const valueSets = getJSONFixture('cqm_measures/CMS105v7/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS105v7/CMS105v7.json');
      const patients = [getJSONFixture('patients/CMS105v7/StatinAtDC_NUMERPass.json')];
      const options = { doPretty: true, requestDocument: true };
      const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
      expect(result.IPP).toEqual(1);
      expect(result.DENOM).toEqual(1);
      expect(result.NUMER).toEqual(1);
    });
  });

  describe('Using cqm-models passed in', () => {
    it('Doesn\'t pollute Measure model to calculate measure with stratification', () => {
      const valueSets = getJSONFixture('cqm_measures/CMS160v7/value_sets.json');
      const measure = getJSONFixture('cqm_measures/CMS160v7/CMS160v7.json');
      const numPass = getJSONFixture('patients/CMS160v7/PHQ9EBEDec_PerDzDxSAEDec_NUM1Pass.json');
      const patients = [];
      patients.push(new CqmModels.QDMPatient(numPass.qdmPatient));
      const cqmMeasure = new CqmModels.Measure(measure);

      // sanity check number of population_sets
      expect(cqmMeasure.population_sets.length).toBe(3);

      const options = { doPretty: true, requestDocument: true };
      const calculationResults = Calculator.calculate(cqmMeasure, patients, valueSets, options);
      const numPassResults = calculationResults[Object.keys(calculationResults)[0]];

      // make sure number of population_sets did not change
      expect(cqmMeasure.population_sets.length).toBe(3);

      // Patient expiredDenexResults Population Set 1 - borrowed from 'multiple population and stratification measure correctly' abpve
      const pop2Strat1 = numPassResults['PopulationCriteria2'];
      const pop2Strat1StatementResults = pop2Strat1.statement_results_by_statement().DepressionUtilizationofthePHQ9Tool;
      expect(pop2Strat1StatementResults['May through August of Measurement Period'].pretty).toBe('INTERVAL: 05/01/2012 12:00 AM - 09/01/2012 12:00 AM');
    });
  });
});
