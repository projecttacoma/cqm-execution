/* eslint dot-notation: 0 */ // --> OFF

const ResultsHelpers = require('../../lib/helpers/results_helpers');
const cql = require('cqm-models').CQL;
const getJSONFixture = require('../support/spec_helper.js').getJSONFixture;
const Calculator = require('../../lib/models/calculator.js');

describe('ResultsHelpers', () => {
  describe('prettyResult', () => {
    it('should not destroy objects passed in', () => {
      const before = { a: 1, b: 2 };
      const beforeClone = { a: 1, b: 2 };
      ResultsHelpers.prettyResult(before);
      Array.from(before).map((key, value) =>
        expect(value).toEqual(beforeClone[key]));
    });

    it('should not destroy arrays passed in', () => {
      const before = [1, 2, 3];
      const beforeClone = [1, 2, 3];
      ResultsHelpers.prettyResult(before);
      Array.from(before).map((item, index) =>
        expect(item).toEqual(beforeClone[index]));
    });

    it('should properly indent nested objects', () => {
      const nestedObject = { one: 'single item', two: { nested: 'item', nested2: 'item' }, three: { doubleNested: { a: '1', b: '2', c: '3' }, nested: 'item' } };
      const prettyNestedObject = '{\n  one: "single item",\n  three: {\n    doubleNested: {\n      a: "1",\n      b: "2",\n      c: "3"\n    },\n    nested: "item"\n  },\n' +
      '  two: {\n    nested: "item",\n    nested2: "item"\n  }\n}';
      expect(ResultsHelpers.prettyResult(nestedObject)).toEqual(prettyNestedObject);
    });

    it('should properly indent a single array', () => {
      const singleArray = [1, 2, 3];
      expect(ResultsHelpers.prettyResult(singleArray)).toEqual('[1,\n2,\n3]');
    });

    it('should properly indent an array in an object', () => {
      const arrayObject = { array: [1, 2, 3] };
      expect(ResultsHelpers.prettyResult(arrayObject)).toEqual('{\n  array: [1,\n         2,\n         3]\n}');
    });

    it('should properly print Quantity with unit', () => {
      const quantity = new cql.Quantity(1, 'g');
      expect(ResultsHelpers.prettyResult(quantity)).toEqual('QUANTITY: 1 g');
    });

    it('should properly print Quantity without unit', () => {
      const quantity = new cql.Quantity(5, '');
      expect(ResultsHelpers.prettyResult(quantity)).toEqual('QUANTITY: 5');
    });

    describe('pretty statement results when requested', () => {
      xit('for CMS107v6 correctly', () => {
        // TODO: Find another measure to use. PrincipalDiagnosis is no longer a QDM attribute and is used in this measure logic
        const valueSets = getJSONFixture('cqm_measures/CMS107v6/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS107v6/CMS107v6.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, requestDocument: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = result.statement_results_by_statement();

        expect(resultsByStatement.TJC_Overall['Encounter with Principal Diagnosis and Age'].pretty).toEqual('[Encounter, Performed: ' +
        'Non-Elective Inpatient Encounter\nSTART: 10/10/2012 9:30 AM\nSTOP: 10/12/2012 12:15 AM\nCODE: SNOMEDCT 32485007]');
        expect(resultsByStatement.StrokeEducation.Numerator.pretty).toEqual('UNHIT');
      });

      it('for CMS760v0 correctly requesting mongoose document', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, requestDocument: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = result.statement_results_by_statement();

        expect(resultsByStatement.PD0329.IntervalWithTZOffsets.pretty).toEqual('INTERVAL: 08/01/2012 12:00 AM - 12/31/2012 12:00 AM');
      });

      it('for CMS760v0 correctly without mongoose document', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS760v0/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS760v0/CMS760v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result['statement_results'].PD0329.IntervalWithTZOffsets.pretty).toEqual('INTERVAL: 08/01/2012 12:00 AM - 12/31/2012 12:00 AM');
      });

      it('for CMS32v7 correctly', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS32v7/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS32v7/CMS32v7.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS32v7/Visit_1ED.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, includeClauseResults: true, requestDocument: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = result.statement_results_by_statement();

        expect(resultsByStatement.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients['Measure Observation'].pretty).toEqual('FUNCTION');
        expect(resultsByStatement.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients['ED Visit'].pretty).toEqual('[Encounter, Performed: ' +
        'Emergency Department Visit\nSTART: 06/10/2012 5:00 AM\nSTOP: 06/10/2012 5:15 AM\nCODE: SNOMEDCT 4525004]');
        expect(resultsByStatement.MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients['Measure Population Exclusions'].pretty).toEqual('FALSE ([])');
      });

      it('for CMS32v7 correctly without mongoose document result', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS32v7/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS32v7/CMS32v7.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS32v7/Visit_1ED.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result['statement_results'].MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients['Measure Observation'].pretty).toEqual('FUNCTION');
        expect(result['statement_results'].MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients['ED Visit'].pretty).toEqual('[Encounter, Performed: ' +
        'Emergency Department Visit\nSTART: 06/10/2012 5:00 AM\nSTOP: 06/10/2012 5:15 AM\nCODE: SNOMEDCT 4525004]');
        expect(result['statement_results'].MedianTimefromEDArrivaltoEDDepartureforDischargedEDPatients['Measure Population Exclusions'].pretty).toEqual('FALSE ([])');
      });

      it('for CMS735v0 correctly', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS735v0/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS735v0/CMS735v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS735v0/first_last.json'));
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, requestDocument: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = result.statement_results_by_statement();

        expect(resultsByStatement.StatinTherapy['In Demographic'].pretty).toEqual('true');
      });

      it('for CMS460v0 correctly', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS460v0/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS460v0/CMS460v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS460v0/Opioid_Test.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, requestDocument: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = result.statement_results_by_statement();

        expect(resultsByStatement.DayMonthTimings['Months Containing 29 Days'].pretty).toEqual('[1,\n2,\n3,\n4,\n5,\n6,\n7,\n8,\n9,\n10,\n11,\n12,\n13,\n14,\n15,\n16,' +
          '\n17,\n18,\n19,\n20,\n21,\n22,\n23,\n24,\n25,\n26,\n27,\n28,\n29]');
        expect(resultsByStatement.PotentialOpioidOveruse['Prescription Days'].pretty).toContain('05/09/2012 12:00 AM');
        expect(resultsByStatement.PotentialOpioidOveruse['Prescription Days'].pretty).toContain('rxNormCode: CODE: RxNorm 1053647');
        expect(resultsByStatement.PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('conversionFactor: 0.13');
        expect(resultsByStatement.PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('effectivePeriod: INTERVAL: 05/09/2012 8:00 AM - 12/28/2012 8:15 AM');
        expect(resultsByStatement.PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('rxNormCode: CODE: RxNorm 1053647');
        expect(resultsByStatement.OpioidData.DrugIngredients.pretty).toContain('drugName: "72 HR Fentanyl 0.075 MG/HR Transdermal System"');
      });

      it('for CMS460v0 correctly without mongoose document result', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS460v0/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS460v0/CMS460v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS460v0/Opioid_Test.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result['statement_results'].DayMonthTimings['Months Containing 29 Days'].pretty).toEqual('[1,\n2,\n3,\n4,\n5,\n6,\n7,\n8,\n9,\n10,\n11,\n12,\n13,\n14,\n15,\n16,' +
          '\n17,\n18,\n19,\n20,\n21,\n22,\n23,\n24,\n25,\n26,\n27,\n28,\n29]');
        expect(result['statement_results'].PotentialOpioidOveruse['Prescription Days'].pretty).toContain('05/09/2012 12:00 AM');
        expect(result['statement_results'].PotentialOpioidOveruse['Prescription Days'].pretty).toContain('rxNormCode: CODE: RxNorm 1053647');
        expect(result['statement_results'].PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('conversionFactor: 0.13');
        expect(result['statement_results'].PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('effectivePeriod: INTERVAL: 05/09/2012 8:00 AM - 12/28/2012 8:15 AM');
        expect(result['statement_results'].PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('rxNormCode: CODE: RxNorm 1053647');
        expect(result['statement_results'].OpioidData.DrugIngredients.pretty).toContain('drugName: "72 HR Fentanyl 0.075 MG/HR Transdermal System"');
      });

      it('should use prevalencePeriod for Diagnosis and infinity dates should not be included', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS134v6/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS134v6/CMS134v6.json');
        const passNumer = getJSONFixture('patients/CMS134v6/Pass_Numer.json');
        const patients = [];
        patients.push(passNumer.qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, requestDocument: true });
        const passNumerResults = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = passNumerResults.statement_results_by_statement();

        expect(resultsByStatement.DiabetesMedicalAttentionforNephropathy['Nephropathy Diagnoses'].pretty).toContain('START: 04/03/2012 12:00 PM');
        expect(resultsByStatement.DiabetesMedicalAttentionforNephropathy['Nephropathy Diagnoses'].pretty).not.toContain('STOP: 12/31/9999 11:59 PM');
      });

      it('should use relevantPeriod for START and END dates for Encounter', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS134v6/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS134v6/CMS134v6.json');
        const passNumer = getJSONFixture('patients/CMS134v6/Pass_Numer.json');
        const patients = [];
        patients.push(passNumer.qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, requestDocument: true });
        const passNumerResults = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = passNumerResults.statement_results_by_statement();

        expect(resultsByStatement.DiabetesMedicalAttentionforNephropathy['Qualifying Encounters'].pretty).toContain('START: 02/02/2012 8:45 AM');
        expect(resultsByStatement.DiabetesMedicalAttentionforNephropathy['Qualifying Encounters'].pretty).toContain('STOP: 02/02/2012 8:45 AM');
      });

      xit('should use authorDatetime for START date for Intervention Order', () => {
        // TODO: Find another measure to use. PrincipalDiagnosis is no longer a QDM attribute and is used in this measure logic
        const valueSets = getJSONFixture('cqm_measures/CMS107v6/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS107v6/CMS107v6.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { doPretty: true, requestDocument: true });
        const denexPassresult = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = denexPassresult.statement_results_by_statement();

        expect(resultsByStatement.StrokeEducation['Intervention Comfort Measures'].pretty).toContain('START: 10/10/2012 8:00 AM');
      });
    });

    describe('no pretty statement results when not requested', () =>
      it('for CMS107 correctly', () => {
        const valueSets = getJSONFixture('cqm_measures/CMS107v6/value_sets.json');
        const measure = getJSONFixture('cqm_measures/CMS107v6/CMS107v6.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json').qdmPatient);
        const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
        const resultsByStatement = result.statement_results_by_statement();

        expect(resultsByStatement.TJC_Overall['Encounter with Principal Diagnosis and Age'].pretty).toEqual(undefined);
        expect(resultsByStatement.StrokeEducation.Numerator.pretty).toEqual(undefined);
      }));
  });

  describe('buildPopulationRelevanceMap', () => {
    it('marks NUMER, NUMEX, DENEXCEP not calculated if DENEX count matches DENOM', () => {
      const populationResults = {
        IPP: 2, DENOM: 2, DENEX: 2, DENEXCEP: 0, NUMER: 0, NUMEX: 0,
      };
      const expectedRelevanceMap = {
        IPP: true, DENOM: true, DENEX: true, DENEXCEP: false, NUMER: false, NUMEX: false,
      };
      const relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    it('marks NUMER, NUMEX, DENEXCEP not calculated if DENEX count exceeds DENOM', () => {
      const populationResults = {
        IPP: 3, DENOM: 2, DENEX: 3, DENEXCEP: 0, NUMER: 0, NUMEX: 0,
      };
      const expectedRelevanceMap = {
        IPP: true, DENOM: true, DENEX: true, DENEXCEP: false, NUMER: false, NUMEX: false,
      };
      const relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    it('marks NUMER, NUMEX calculated if DENEX count does not exceed DENOM', () => {
      const populationResults = {
        IPP: 3, DENOM: 3, DENEX: 1, DENEXCEP: 0, NUMER: 2, NUMEX: 0,
      };
      const expectedRelevanceMap = {
        IPP: true, DENOM: true, DENEX: true, DENEXCEP: false, NUMER: true, NUMEX: true,
      };
      const relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    it('marks OBSERV calculated if MSRPOPLEX is less than MSRPOPL', () => {
      const populationResults = {
        IPP: 3, MSRPOPL: 2, MSRPOPLEX: 1, observation_values: [12],
      };
      const expectedRelevanceMap = {
        IPP: true, MSRPOPL: true, MSRPOPLEX: true, observation_values: true,
      };
      const relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    it('marks OBSERV not calculated if MSRPOPLEX is same as MSRPOPL', () => {
      const populationResults = {
        IPP: 3, MSRPOPL: 2, MSRPOPLEX: 2, observation_values: [12],
      };
      const expectedRelevanceMap = {
        IPP: true, MSRPOPL: true, MSRPOPLEX: true, observation_values: false,
      };
      const relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    it('marks OBSERV not calculated if MSRPOPLEX is greater than MSRPOPL', () => {
      const populationResults = {
        IPP: 3, MSRPOPL: 2, MSRPOPLEX: 3, observation_values: [12],
      };
      const expectedRelevanceMap = {
        IPP: true, MSRPOPL: true, MSRPOPLEX: true, observation_values: false,
      };
      const relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    it('marks MSRPOPLEX not calculated if MSRPOPL is zero', () => {
      const populationResults = {
        IPP: 3, MSRPOPL: 0, MSRPOPLEX: 0, observation_values: [],
      };
      const expectedRelevanceMap = {
        IPP: true, MSRPOPL: true, MSRPOPLEX: false, observation_values: false,
      };
      let relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);

      const initialResults = {
        IPP: 1, MSRPOPL: 0, MSRPOPLEX: 1,
      };
      const expectedResults = {
        IPP: true, MSRPOPL: true, MSRPOPLEX: false,
      };
      relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(initialResults);
      expect(relevanceMap).toEqual(expectedResults);
    });

    it('marks MSRPOPLEX calculated if MSRPOPL is 1', () => {
      let initialResults = {
        IPP: 1, MSRPOPL: 1, MSRPOPLEX: 1,
      };
      let expectedResults = {
        IPP: true, MSRPOPL: true, MSRPOPLEX: true,
      };
      const relevanceMap = ResultsHelpers.buildPopulationRelevanceMap(initialResults);
      expect(relevanceMap).toEqual(expectedResults);

      initialResults = {
        IPP: 1, MSRPOPL: 1, MSRPOPLEX: 0,
      };
      expectedResults = {
        IPP: true, MSRPOPL: true, MSRPOPLEX: true,
      };
      const populationRelevanceMap = ResultsHelpers.buildPopulationRelevanceMap(initialResults);
      expect(populationRelevanceMap).toEqual(expectedResults);
    });
  });

  describe('populationRelevanceForAllEpisodes', () => {
    it('correctly builds population_relevance for multiple episodes in all populations', () => {
      const episodeResults = {
        episode1: {
          IPP: 1, DENOM: 1, DENEX: 0, DENEXCEP: 1, NUMER: 0, NUMEX: 0,
        },
        episode2: {
          IPP: 1, DENOM: 1, DENEX: 0, DENEXCEP: 0, NUMER: 1, NUMEX: 1,
        },
        episode3: {
          IPP: 1, DENOM: 1, DENEX: 1, DENEXCEP: 0, NUMER: 0, NUMEX: 0,
        },
      };
      const expectedRelevanceMap = {
        IPP: true, DENOM: true, DENEX: true, DENEXCEP: true, NUMER: true, NUMEX: true,
      };
      const relevanceMap = ResultsHelpers.populationRelevanceForAllEpisodes(episodeResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    it('correctly builds population_relevance for multiple episodes in no populations', () => {
      const episodeResults = {
        episode1: {
          IPP: 0, DENOM: 0, DENEX: 0, DENEXCEP: 0, NUMER: 0, NUMEX: 0,
        },
        episode2: {
          IPP: 0, DENOM: 0, DENEX: 0, DENEXCEP: 0, NUMER: 0, NUMEX: 0,
        },
        episode3: {
          IPP: 0, DENOM: 0, DENEX: 0, DENEXCEP: 0, NUMER: 0, NUMEX: 0,
        },
      };
      // IPP will be relevant because nothing has rendered it irrelevant
      const expectedRelevanceMap = {
        IPP: true, DENOM: false, DENEX: false, DENEXCEP: false, NUMER: false, NUMEX: false,
      };
      const relevanceMap = ResultsHelpers.populationRelevanceForAllEpisodes(episodeResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });
  });
});
