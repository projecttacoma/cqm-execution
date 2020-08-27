const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.ContinuousFhir", () => {
  it("calculates patient1", () => {
    const measure = getJSONFixture("fhir_cqm_measures/ContinuousFhir/ContinuousFhir.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/ContinuousFhir/tests-patient1-ContinuousFhir-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    // There will not be episode_results on the result object
    expect(result["episode_results"]).toBeUndefined();
    expect(result.population_relevance).toEqual({
      IPP: true,
      MSRPOPL: true,
      observation_values: false
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.patient).toEqual("patient1-ContinuousFhir");
  });

  it("calculates patient2", () => {
    const measure = getJSONFixture("fhir_cqm_measures/ContinuousFhir/ContinuousFhir.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/ContinuousFhir/tests-patient2-ContinuousFhir-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    // There will not be episode_results on the result object
    expect(result["episode_results"]).toBeUndefined();
    expect(result.population_relevance).toEqual({
      IPP: true,
      MSRPOPL: true,
      observation_values: false
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.patient).toEqual("patient2-ContinuousFhir");
  });
});
