const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator", () => {
  describe("CMS74", () => {
    it("calculates denom patient", () => {
      const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
      const valueSets = measure.value_sets;
      const patients = [];
      patients.push(
        getJSONFixture("fhir_cqm_measures/CMS74/tests-denom-EXM74-cqm-patient.json")
      );
      const calculationResults = Calculator.calculate(
        measure,
        patients,
        valueSets,
        { }
      );
      const result = Object.values(
        calculationResults[Object.keys(calculationResults)[0]]
      )[0];

      // There will not be episode_results on the result object
      expect(result["episode_results"]).toBeUndefined();
      // The IPP should be the only relevant population
      // TODO: why not DENOM?
      expect(result.population_relevance).toEqual({
        IPP: true,
        DENOM: false,
        DENEX: false,
        NUMER: false,
      });
    });

    it("calculates denomexcl patient", () => {
      const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
      const valueSets = measure.value_sets;
      const patients = [];
      patients.push(
        getJSONFixture("fhir_cqm_measures/CMS74/tests-denomexcl-EXM74-cqm-patient.json")
      );
      const calculationResults = Calculator.calculate(
        measure,
        patients,
        valueSets,
        { }
      );
      const result = Object.values(
        calculationResults[Object.keys(calculationResults)[0]]
      )[0];

      // There will not be episode_results on the result object
      expect(result["episode_results"]).toBeUndefined();
      // The IPP should be the only relevant population
      // TODO: why not denomexcl?
      expect(result.population_relevance).toEqual({
        IPP: true,
        DENOM: false,
        DENEX: false,
        NUMER: false,
      });
    });

    it("calculates numer-strat1 patient", () => {
      const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
      const valueSets = measure.value_sets;
      const patients = [];
      patients.push(
        getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat1-EXM74-cqm-patient.json")
      );
      const calculationResults = Calculator.calculate(
        measure,
        patients,
        valueSets,
        { }
      );
      const result = Object.values(
        calculationResults[Object.keys(calculationResults)[0]]
      )[0];

      // There will not be episode_results on the result object
      expect(result["episode_results"]).toBeUndefined();
      // The IPP should be the only relevant population
      // TODO: why not denomexcl?
      expect(result.population_relevance).toEqual({
        IPP: true,
        DENOM: false,
        DENEX: false,
        NUMER: false,
      });
    });

    it("calculates numer-strat2 patient", () => {
      const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
      const valueSets = measure.value_sets;
      const patients = [];
      patients.push(
        getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat2-EXM74-cqm-patient.json")
      );
      const calculationResults = Calculator.calculate(
        measure,
        patients,
        valueSets,
        { }
      );
      const result = Object.values(
        calculationResults[Object.keys(calculationResults)[0]]
      )[0];

      // There will not be episode_results on the result object
      expect(result["episode_results"]).toBeUndefined();
      // The IPP should be the only relevant population
      // TODO: why not denomexcl?
      expect(result.population_relevance).toEqual({
        IPP: true,
        DENOM: false,
        DENEX: false,
        NUMER: false,
      });
    });

    it("calculates numer-strat3 patient", () => {
      const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
      const valueSets = measure.value_sets;
      const patients = [];
      patients.push(
        getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat3-EXM74-cqm-patient.json")
      );
      const calculationResults = Calculator.calculate(
        measure,
        patients,
        valueSets,
        { }
      );
      const result = Object.values(
        calculationResults[Object.keys(calculationResults)[0]]
      )[0];

      // There will not be episode_results on the result object
      expect(result["episode_results"]).toBeUndefined();
      // The IPP should be the only relevant population
      // TODO: why not denomexcl?
      expect(result.population_relevance).toEqual({
        IPP: true,
        DENOM: false,
        DENEX: false,
        NUMER: false,
      });
    });
  });
});
