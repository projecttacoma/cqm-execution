const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.BonnieCohort", () => {
  it("calculates patient1", () => {
    const measure = getJSONFixture("fhir_cqm_measures/BonnieCohort/BonnieCohort.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/BonnieCohort/tests-patient1-BonnieCohort-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    // There will not be episode_results on the result object
    expect(result["episode_results"]).toBeUndefined();
    expect(result.population_relevance).toEqual({
      IPP: true,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.patient).toEqual("patient1-BonnieCohort");
  });

  it("calculates patient2", () => {
    const measure = getJSONFixture("fhir_cqm_measures/BonnieCohort/BonnieCohort.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/BonnieCohort/tests-patient2-BonnieCohort-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    // There will not be episode_results on the result object
    expect(result["episode_results"]).toBeUndefined();
    expect(result.population_relevance).toEqual({
      IPP: true,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.patient).toEqual("patient2-BonnieCohort");
  });
});
