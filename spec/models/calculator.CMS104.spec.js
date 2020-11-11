const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.CMS104", () => {
  it("calculates denom patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS104/CMS104.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS104/tests-denom-EXM104-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    // There will not be episode_results on the result object
    expect(result.episode_results).toEqual({});
    // The IPP should be the only relevant population
    expect(result.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEXCEP: false,
      DENEX: false,
      NUMER: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(0);
    expect(result.patient).toEqual("denom-EXM104");
  });

  it("calculates numer patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS104/CMS104.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS104/tests-numer-EXM104-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    // There will not be episode_results on the result object
    expect(result.episode_results).toEqual({});
    // The IPP should be the only relevant population
    expect(result.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEXCEP: false,
      DENEX: false,
      NUMER: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(0);
    expect(result.patient).toEqual("numer-EXM104");
  });
});
