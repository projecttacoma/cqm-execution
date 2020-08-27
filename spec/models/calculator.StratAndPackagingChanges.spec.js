const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.StratAndPackagingChanges", () => {
  it("calculates patient1", () => {
    const measure = getJSONFixture("fhir_cqm_measures/StratAndPackagingChanges/StratAndPackagingChanges.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/StratAndPackagingChanges/tests-patient1-StratAndPackagingChanges-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1", "PopulationSet_1_Stratification_1"]);
    expect(Object.values(calculationResults[Object.keys(calculationResults)[0]]).length).toEqual(2);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      NUMER: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(0);
    expect(result1.patient).toEqual("patient1-StratAndPackagingChanges");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: false,
      NUMER: false,
      DENOM: false,
      STRAT: true,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(0);
    expect(result2.patient).toEqual("patient1-StratAndPackagingChanges");
  });

  it("calculates patient2", () => {
    const measure = getJSONFixture("fhir_cqm_measures/StratAndPackagingChanges/StratAndPackagingChanges.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/StratAndPackagingChanges/tests-patient2-StratAndPackagingChanges-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1", "PopulationSet_1_Stratification_1"]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      NUMER: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(0);
    expect(result1.patient).toEqual("patient2-StratAndPackagingChanges");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: false,
      NUMER: false,
      DENOM: false,
      STRAT: true,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(0);
    expect(result2.patient).toEqual("patient2-StratAndPackagingChanges");
  });
});
