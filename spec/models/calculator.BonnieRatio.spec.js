const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.BonnieRatio", () => {
  it("calculates patient1", () => {
    const measure = getJSONFixture("fhir_cqm_measures/BonnieRatio/BonnieRatio.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/BonnieRatio/tests-patient1-BonnieRatio-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1", "PopulationSet_2"]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    // There will not be episode_results on the result1 object
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENEX: true,
      DENOM: true,
      NUMER: false,
      NUMEX: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(1);
    expect(result1.patient).toEqual("patient1-BonnieRatio");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: true,
      DENEX: true,
      DENOM: true,
      NUMER: false,
      NUMEX: false,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(1);
    expect(result2.patient).toEqual("patient1-BonnieRatio");
  });

  it("calculates patient2", () => {
    const measure = getJSONFixture("fhir_cqm_measures/BonnieRatio/BonnieRatio.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/BonnieRatio/tests-patient2-BonnieRatio-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1", "PopulationSet_2"]);

    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result["episode_results"]).toBeUndefined();
    expect(result.population_relevance).toEqual({
      IPP: true,
      DENEX: true,
      DENOM: true,
      NUMER: false,
      NUMEX: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.patient).toEqual("patient2-BonnieRatio");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: true,
      DENEX: true,
      DENOM: true,
      NUMER: false,
      NUMEX: false,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(1);
    expect(result2.patient).toEqual("patient2-BonnieRatio");
  });
});
