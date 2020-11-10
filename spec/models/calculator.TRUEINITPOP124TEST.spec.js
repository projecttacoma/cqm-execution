const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.TRUEINITPOPEXM124TEST", () => {

  it("calculates patient-numer-EXM124", () => {
    const measure = getJSONFixture("fhir_cqm_measures/SERHIIEXM124Test/SERHIIEXM124Test.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/SERHIIEXM124Test/patient-numer-EXM124.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    expect(result.population_relevance).toEqual({
      IPP: true,
      DENEX: true,
      DENOM: true,
      NUMER: true,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.DENEX).toEqual(0);
    expect(result.DENOM).toEqual(1);
    expect(result.NUMER).toEqual(0);
    expect(result.patient).toEqual("numer-EXM124");
    expect(result.statement_relevance.SerhiiFHIRMEASUREEXM124001['Initial Population']).toEqual('TRUE')
    expect(result.statement_results.SerhiiFHIRMEASUREEXM124001['Initial Population'].final).toBe('TRUE')
    expect(result.statement_results.SerhiiFHIRMEASUREEXM124001['Initial Population'].raw).toBe(true)
  });

  it("calculates patient-numer-EXM124", () => {
    const measure = getJSONFixture("fhir_cqm_measures/SERHIIEXM124Test/SERHIIEXM124Test.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/SERHIIEXM124Test/patient-DenExclPass-HospicePerformedOverlapsMP.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    expect(result.population_relevance).toEqual({
      IPP: true,
      DENEX: true,
      DENOM: true,
      NUMER: true,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.DENEX).toEqual(0);
    expect(result.DENOM).toEqual(1);
    expect(result.NUMER).toEqual(0);
    expect(result.patient).toEqual("5fa42748367e1946899d312a");
    expect(result.statement_relevance.SerhiiFHIRMEASUREEXM124001['Initial Population']).toEqual('TRUE')
    expect(result.statement_results.SerhiiFHIRMEASUREEXM124001['Initial Population'].final).toBe('TRUE')
    expect(result.statement_results.SerhiiFHIRMEASUREEXM124001['Initial Population'].raw).toBe(true)
  });

});
