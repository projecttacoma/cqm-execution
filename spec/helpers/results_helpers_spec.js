const ResultsHelpers = require('../../lib/helpers/results_helpers');
const cql = require('cqm-models').CQL;
const getJSONFixture = require('../support/spec_helper.js').getJSONFixture;
const Mongoose = require('mongoose');
const QDMPatientSchema = require('cqm-models').PatientSchema;
const PatientSource = require('../../lib/models/patient_source.js');
const Calculator = require('../../lib/models/calculator.js');

describe('MeasureHelpers', function() {
  describe('prettyResult', function() {
    it('should not destroy objects passed in', function() {
      const before = {'a': 1, 'b': 2};
      const beforeClone = {'a': 1, 'b': 2};
      ResultsHelpers.prettyResult(before);
      Array.from(before).map((key, value) =>
        expect(value).toEqual(beforeClone[key]));
    });

    it('should not destroy arrays passed in', function() {
      const before = [1, 2, 3];
      const beforeClone = [1, 2, 3];
      ResultsHelpers.prettyResult(before);
      Array.from(before).map((item, index) =>
        expect(item).toEqual(beforeClone[index]));
    });

    it('should properly indent nested objects', function() {
      const nestedObject = {'one': 'single item', 'two': {'nested': 'item', 'nested2': 'item'}, 'three': {'doubleNested': {'a' : '1', 'b': '2', 'c': '3'}, 'nested': 'item'}};
      const prettyNestedObject = "{\n  one: \"single item\",\n  two: {\n    nested: \"item\",\n    nested2: \"item\"\n  },\n  three: {\n    doubleNested: {\n      a: \"1\",\n      b: \"2\",\n      c: \"3\"\n    },\n    nested: \"item\"\n  }\n}";
      expect(ResultsHelpers.prettyResult(nestedObject)).toEqual(prettyNestedObject);
    });

    it('should properly indent a single array', function() {
      const singleArray = [1, 2, 3];
      expect(ResultsHelpers.prettyResult(singleArray)).toEqual('[1,\n2,\n3]');
    });

    it('should properly indent an array in an object', function() {
      const arrayObject = {'array': [1, 2, 3]};
      expect(ResultsHelpers.prettyResult(arrayObject)).toEqual('{\n  array: [1,\n         2,\n         3]\n}');
    });

    it('should properly print Quantity with unit', function() {
      const quantity = new cql.Quantity({value: 1, unit: 'g'});
      expect(ResultsHelpers.prettyResult(quantity)).toEqual('Quantity: 1 g');
    });

    it('should properly print Quantity without unit', function() {
      const quantity = new cql.Quantity({value: 5});
      expect(ResultsHelpers.prettyResult(quantity)).toEqual('Quantity: 5');
    });

    describe('pretty statement results when requested', function() {
      it('for CMS107v6 correctly', function() {
        const valueSetsByOid = getJSONFixture('measures/CMS107v6/value_sets.json');
        const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json'));
        const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
        const qdmPatients = patients.map(patient => new QDMPatient(patient));
        const qdmPatientsSource = new PatientSource(qdmPatients);
        const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid, {doPretty: true});
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result.get('statement_results').TJC_Overall['Encounter with Principal Diagnosis and Age'].pretty).toEqual('[Encounter, Performed: Non-Elective Inpatient Encounter\nSTART: 10/10/2012 9:30 AM\nSTOP: 10/12/2012 12:15 AM\nCODE: SNOMED-CT 32485007]');
        expect(result.get('statement_results').StrokeEducation.Numerator.pretty).toEqual('UNHIT');
      });

      it('for CMS760v0 correctly', function() {
        const valueSetsByOid = getJSONFixture('measures/CMS760v0/value_sets.json');
        const measure = getJSONFixture('measures/CMS760v0/CMS760v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS760v0/Correct_Timezone.json'));
        const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
        const qdmPatients = patients.map(patient => new QDMPatient(patient));
        const qdmPatientsSource = new PatientSource(qdmPatients);
        const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid, {doPretty: true});
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result.get('statement_results').PD0329.IntervalWithTZOffsets.pretty).toEqual('Interval: 08/01/2012 12:00 AM - 12/31/2012 12:00 AM');
      });

      it('for CMS721v0 correctly', function() {
        const valueSetsByOid = getJSONFixture('measures/CMS721v0/value_sets.json');
        const measure = getJSONFixture('measures/CMS721v0/CMS721v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS721v0/Visit_1ED.json'));
        const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
        const qdmPatients = patients.map(patient => new QDMPatient(patient));
        const qdmPatientsSource = new PatientSource(qdmPatients);
        const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid, {doPretty: true});
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result.get('statement_results').Test32['Measure Observation'].pretty).toEqual('FUNCTION');
        expect(result.get('statement_results').Test32['ED Visit'].pretty).toEqual('[Encounter, Performed: Emergency department patient visit (procedure)\nSTART: 11/22/2012 8:00 AM\nSTOP: 11/22/2012 8:15 AM\nCODE: SNOMED-CT 4525004]');
        expect(result.get('statement_results').Test32['Measure Population Exclusions'].pretty).toEqual('FALSE ([])');
      });

      it('for CMS735v0 correctly', function() {
        const valueSetsByOid = getJSONFixture('measures/CMS735v0/value_sets.json');
        const measure = getJSONFixture('measures/CMS735v0/CMS735v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS735v0/first_last.json'));
        const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
        const qdmPatients = patients.map(patient => new QDMPatient(patient));
        const qdmPatientsSource = new PatientSource(qdmPatients);
        const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid, {doPretty: true});
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result.get('statement_results').StatinTherapy['In Demographic'].pretty).toEqual('true');
      });

      it('for CMS460v0 correctly', function() {
        const valueSetsByOid = getJSONFixture('measures/CMS460v0/value_sets.json');
        const measure = getJSONFixture('measures/CMS460v0/CMS460v0.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS460v0/Opioid_Test.json'));
        const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
        const qdmPatients = patients.map(patient => new QDMPatient(patient));
        const qdmPatientsSource = new PatientSource(qdmPatients);
        const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid, {doPretty: true});
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result.get('statement_results').DayMonthTimings['Months Containing 29 Days'].pretty).toEqual('[1,\n2,\n3,\n4,\n5,\n6,\n7,\n8,\n9,\n10,\n11,\n12,\n13,\n14,\n15,\n16,\n17,\n18,\n19,\n20,\n21,\n22,\n23,\n24,\n25,\n26,\n27,\n28,\n29]');
        expect(result.get('statement_results').PotentialOpioidOveruse['Prescription Days'].pretty).toContain('05/09/2012 12:00 AM');
        expect(result.get('statement_results').PotentialOpioidOveruse['Prescription Days'].pretty).toContain('rxNormCode: Code: RxNorm: 1053647');
        expect(result.get('statement_results').PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('conversionFactor: 0.13');
        expect(result.get('statement_results').PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('effectivePeriod: Interval: 05/09/2012 8:00 AM - 12/28/2012 8:15 AM');
        expect(result.get('statement_results').PotentialOpioidOveruse['Prescriptions with MME'].pretty).toContain('rxNormCode: Code: RxNorm: 1053647');
        expect(result.get('statement_results').OpioidData.DrugIngredients.pretty).toContain('drugName: "72 HR Fentanyl 0.075 MG/HR Transdermal System"');
      });
    });

    describe('no pretty statement results when not requested', () =>
      it('for CMS107 correctly', function() {
        const valueSetsByOid = getJSONFixture('measures/CMS107v6/value_sets.json');
        const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');
        const patients = [];
        patients.push(getJSONFixture('patients/CMS107v6/DENEXPass_CMOduringED.json'));
        const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
        const qdmPatients = patients.map(patient => new QDMPatient(patient));
        const qdmPatientsSource = new PatientSource(qdmPatients);
        const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid);
        const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

        expect(result.get('statement_results').TJC_Overall['Encounter with Principal Diagnosis and Age'].pretty).toEqual(undefined);
        expect(result.get('statement_results').StrokeEducation.Numerator.pretty).toEqual(undefined);
      })
    );
  });

  describe('buildPopulationRelevanceMap', function() {
    it('marks NUMER, NUMEX, DENEXCEP not calculated if DENEX count matches DENOM', function() {
      const population_results = { IPP: 2, DENOM: 2, DENEX: 2, DENEXCEP: 0, NUMER: 0, NUMEX: 0 };
      const expected_relevance_map = { IPP: true, DENOM: true, DENEX: true, DENEXCEP: false, NUMER: false, NUMEX: false };
      const relevance_map = ResultsHelpers.buildPopulationRelevanceMap(population_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });

    it('marks NUMER, NUMEX, DENEXCEP not calculated if DENEX count exceeds DENOM', function() {
      const population_results = { IPP: 3, DENOM: 2, DENEX: 3, DENEXCEP: 0, NUMER: 0, NUMEX: 0 };
      const expected_relevance_map = { IPP: true, DENOM: true, DENEX: true, DENEXCEP: false, NUMER: false, NUMEX: false };
      const relevance_map = ResultsHelpers.buildPopulationRelevanceMap(population_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });

    it('marks NUMER, NUMEX calculated if DENEX count does not exceed DENOM', function() {
      const population_results = { IPP: 3, DENOM: 3, DENEX: 1, DENEXCEP: 0, NUMER: 2, NUMEX: 0 };
      const expected_relevance_map = { IPP: true, DENOM: true, DENEX: true, DENEXCEP: false, NUMER: true, NUMEX: true };
      const relevance_map = ResultsHelpers.buildPopulationRelevanceMap(population_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });

    it('marks OBSERV calculated if MSRPOPLEX is less than MSRPOPL', function() {
      const population_results = {IPP: 3, MSRPOPL: 2, MSRPOPLEX: 1, values: [12]};
      const expected_relevance_map = { IPP: true, MSRPOPL: true, MSRPOPLEX: true, values: true };
      const relevance_map = ResultsHelpers.buildPopulationRelevanceMap(population_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });

    it('marks OBSERV not calculated if MSRPOPLEX is same as MSRPOPL', function() {
      const population_results = {IPP: 3, MSRPOPL: 2, MSRPOPLEX: 2, values: [12]};
      const expected_relevance_map = { IPP: true, MSRPOPL: true, MSRPOPLEX: true, values: false };
      const relevance_map = ResultsHelpers.buildPopulationRelevanceMap(population_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });

    it('marks OBSERV not calculated if MSRPOPLEX is greater than MSRPOPL', function() {
      const population_results = {IPP: 3, MSRPOPL: 2, MSRPOPLEX: 3, values: [12]};
      const expected_relevance_map = { IPP: true, MSRPOPL: true, MSRPOPLEX: true, values: false };
      const relevance_map = ResultsHelpers.buildPopulationRelevanceMap(population_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });

    it('marks MSRPOPLEX not calculated if MSRPOPL is zero', function() {
      const population_results = {IPP: 3, MSRPOPL: 0, MSRPOPLEX: 0, values: []};
      const expected_relevance_map = { IPP: true, MSRPOPL: true, MSRPOPLEX: false, values: false };
      let relevance_map = ResultsHelpers.buildPopulationRelevanceMap(population_results);
      expect(relevance_map).toEqual(expected_relevance_map);

      const initial_results = {IPP: 1, MSRPOPL: 0, MSRPOPLEX: 1};
      const expected_results = {IPP: true, MSRPOPL: true, MSRPOPLEX: false};
      relevance_map = ResultsHelpers.buildPopulationRelevanceMap(initial_results);
      expect(relevance_map).toEqual(expected_results);
    });

    it('marks MSRPOPLEX calculated if MSRPOPL is 1', function() {
      let initial_results = {IPP: 1, MSRPOPL: 1, MSRPOPLEX: 1};
      let expected_results = {IPP: true, MSRPOPL: true, MSRPOPLEX: true};
      const relevance_map = ResultsHelpers.buildPopulationRelevanceMap(initial_results);
      expect(relevance_map).toEqual(expected_results);

      initial_results = {IPP: 1, MSRPOPL: 1, MSRPOPLEX: 0};
      expected_results = {IPP: true, MSRPOPL: true, MSRPOPLEX: true};
      const population_relevance_map = ResultsHelpers.buildPopulationRelevanceMap(initial_results);
      expect(population_relevance_map).toEqual(expected_results);
    });
  });

  describe('populationRelevanceForAllEpisodes', function() {
    it('correctly builds population_relevance for multiple episodes in all populations', function() {
      const episode_results = {
        episode1: {IPP: 1, DENOM: 1, DENEX: 0, DENEXCEP: 1, NUMER: 0, NUMEX: 0},
        episode2: {IPP: 1, DENOM: 1, DENEX: 0, DENEXCEP: 0, NUMER: 1, NUMEX: 1},
        episode3: {IPP: 1, DENOM: 1, DENEX: 1, DENEXCEP: 0, NUMER: 0, NUMEX: 0}
      };
      const expected_relevance_map = { IPP: true, DENOM: true, DENEX: true, DENEXCEP: true, NUMER: true, NUMEX: true };
      const relevance_map = ResultsHelpers.populationRelevanceForAllEpisodes(episode_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });

    it('correctly builds population_relevance for multiple episodes in no populations', function() {
      const episode_results = {
        episode1: {IPP: 0, DENOM: 0, DENEX: 0, DENEXCEP: 0, NUMER: 0, NUMEX: 0},
        episode2: {IPP: 0, DENOM: 0, DENEX: 0, DENEXCEP: 0, NUMER: 0, NUMEX: 0},
        episode3: {IPP: 0, DENOM: 0, DENEX: 0, DENEXCEP: 0, NUMER: 0, NUMEX: 0}
      };
      // IPP will be relevant because nothing has rendered it irrelevant
      const expected_relevance_map = { IPP: true, DENOM: false, DENEX: false, DENEXCEP: false, NUMER: false, NUMEX: false };
      const relevance_map = ResultsHelpers.populationRelevanceForAllEpisodes(episode_results);
      expect(relevance_map).toEqual(expected_relevance_map);
    });
  });
});
