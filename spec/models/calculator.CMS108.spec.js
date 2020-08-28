const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.CMS108", () => {
  it("calculates patient1", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS108/CMS108.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS108/tests-patient1-CMS108-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    expect(result["episode_results"]).toEqual({});
    expect(result.population_relevance).toEqual({
      IPP: true,
      DENEX: false,
      DENOM: false,
      NUMER: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(0);
    expect(result.patient).toEqual("patient1-CMS108");
  });

  it("calculates patient2", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS108/CMS108.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS108/tests-patient2-CMS108-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    expect(result["episode_results"]).toEqual({});
    expect(result.population_relevance).toEqual({
      IPP: true,
      DENEX: false,
      DENOM: false,
      NUMER: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(0);
    expect(result.patient).toEqual("patient2-CMS108");
  });

  it("calculates denom patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS108/CMS108.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS108/tests-denom-CMS108-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    expect(result["episode_results"]).toEqual({});
    expect(result.population_relevance).toEqual({
      IPP: true,
      DENEX: false,
      DENOM: false,
      NUMER: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(0);
    expect(result.patient).toEqual("denom-EXM108");
  });
});
