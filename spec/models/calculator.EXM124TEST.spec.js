const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.EXM124TEST", () => {
  it("calculates patient-DenExclPass-HospicePerformedOverlapsMP", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/EXM124TEST.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/patient-DenExclPass-HospicePerformedOverlapsMP.json"));
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
    expect(result.NUMER).toEqual(0);
    expect(result.DENEX).toEqual(0);
    expect(result.patient).toEqual("5fa42748367e1946899d312a");
    expect(result.statement_relevance.CVFHIREXM124TESTMEASURE001['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].final).toBe('TRUE');
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].raw).toBe(true);
    expect(result.statement_results.AdultOutpatientEncountersFHIR4["Qualifying Encounters"].final).toEqual("TRUE");
  });

  it("calculates patient-numer-EXM124", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/EXM124TEST.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/patient-numer-EXM124.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual(["PopulationSet_1"]);
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    // expect(result["episode_results"]).toEqual({});
    expect(result.population_relevance).toEqual({
      IPP: true,
      DENEX: true,
      DENOM: true,
      NUMER: true,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.NUMER).toEqual(1);
    expect(result.patient).toEqual("numer-EXM124");
    expect(result.statement_relevance.CVFHIREXM124TESTMEASURE001['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].final).toBe('TRUE');
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].raw).toBe(true);
  });

  it("Bonnie Patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/EXM124TEST.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/bonnie-patient.json"));

    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    expect(result.IPP).toEqual(1);
    expect(result.statement_relevance.CVFHIREXM124TESTMEASURE001['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].final).toBe('TRUE');
    expect(result.statement_results.AdultOutpatientEncountersFHIR4["Qualifying Encounters"].final).toEqual("TRUE");
  });

  it("calculates patient-denom-EXM124", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/EXM124TEST.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/patient-denom-EXM124.json"));
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
    expect(result.DENOM).toEqual(1);
    expect(result.NUMER).toEqual(0);
    expect(result.DENEX).toEqual(0);
    expect(result.patient).toEqual("denom-EXM124");
    expect(result.statement_relevance.CVFHIREXM124TESTMEASURE001['Initial Population']).toEqual('TRUE')
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].final).toBe('TRUE')
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].raw).toBe(true)
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Denominator'].final).toBe('TRUE')
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Denominator'].raw).toBe(true)
  });

  it("calculates patient-denomexcl-EXM124", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/EXM124TEST.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/patient-denomexcl-EXM124.json"));
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
    // DENEX should be 1?
    expect(result.DENEX).toEqual(0);
    expect(result.DENOM).toEqual(1);
    expect(result.NUMER).toEqual(0);
    expect(result.patient).toEqual("denomexcl-EXM124");
    expect(result.statement_relevance.CVFHIREXM124TESTMEASURE001['Initial Population']).toEqual('TRUE')
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].final).toBe('TRUE')
    expect(result.statement_results.CVFHIREXM124TESTMEASURE001['Initial Population'].raw).toBe(true)
  });
});
