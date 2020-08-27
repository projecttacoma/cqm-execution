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
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual([
      "PopulationSet_1",
      "PopulationSet_2",
      "PopulationSet_1_Stratification_1",
      "PopulationSet_1_Stratification_2",
    ]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      MSRPOPL: true,
      observation_values: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(1);
    expect(result1.patient).toEqual("patient1-ContinuousFhir");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: true,
      MSRPOPL: true,
      observation_values: false,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(1);
    expect(result2.patient).toEqual("patient1-ContinuousFhir");

    const result3 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result3["episode_results"]).toBeUndefined();
    expect(result3.population_relevance).toEqual({
      IPP: false,
      MSRPOPL: false,
      STRAT: true,
      observation_values: false,
    });
    expect(result3.clause_results).toBeNull();
    expect(result3.state).toEqual("complete");
    expect(result3.IPP).toEqual(0);
    expect(result3.patient).toEqual("patient1-ContinuousFhir");

    const result4 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result4["episode_results"]).toBeUndefined();
    expect(result4.population_relevance).toEqual({
      IPP: false,
      MSRPOPL: false,
      STRAT: true,
      observation_values: false,
    });
    expect(result4.clause_results).toBeNull();
    expect(result4.state).toEqual("complete");
    expect(result4.IPP).toEqual(0);
    expect(result4.patient).toEqual("patient1-ContinuousFhir");
  });

  it("calculates patient2", () => {
    const measure = getJSONFixture("fhir_cqm_measures/ContinuousFhir/ContinuousFhir.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/ContinuousFhir/tests-patient2-ContinuousFhir-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual([
      "PopulationSet_1",
      "PopulationSet_2",
      "PopulationSet_1_Stratification_1",
      "PopulationSet_1_Stratification_2",
    ]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      MSRPOPL: true,
      observation_values: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(1);
    expect(result1.patient).toEqual("patient2-ContinuousFhir");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: true,
      MSRPOPL: true,
      observation_values: false,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(1);
    expect(result2.patient).toEqual("patient2-ContinuousFhir");

    const result3 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result3["episode_results"]).toBeUndefined();
    expect(result3.population_relevance).toEqual({
      IPP: false,
      MSRPOPL: false,
      STRAT: true,
      observation_values: false,
    });
    expect(result3.clause_results).toBeNull();
    expect(result3.state).toEqual("complete");
    expect(result3.IPP).toEqual(0);
    expect(result3.patient).toEqual("patient2-ContinuousFhir");

    const result4 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result4["episode_results"]).toBeUndefined();
    expect(result4.population_relevance).toEqual({
      IPP: false,
      MSRPOPL: false,
      STRAT: true,
      observation_values: false,
    });
    expect(result4.clause_results).toBeNull();
    expect(result4.state).toEqual("complete");
    expect(result4.IPP).toEqual(0);
    expect(result4.patient).toEqual("patient2-ContinuousFhir");
  });
});
