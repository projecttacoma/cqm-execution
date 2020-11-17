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
      NUMER: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.DENOM).toEqual(1);
    expect(result.DENEX).toEqual(1);
    expect(result.patient).toEqual("5fa44008d7559f753fca01e4");
    expect(result.statement_relevance.EXM124['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].final).toBe('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].raw).toBe(true);
    expect(result.statement_results.AdultOutpatientEncountersFHIR4["Qualifying Encounters"].final).toEqual("TRUE");
  });

  it("Run all tests from Mike", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/EXM124TEST.json");
    // const measure = getJSONFixture("fhir_cqm_measures/JK124/EXM124.json");
    const valueSets = measure.value_sets;
    const patientFiles = [
      "patient-DenExclPass-AbsenceofCervixB4MP.json",
      "patient-DenExclPass-DctoFacilityHospiceInptEncEndsDuringMP.json",
      "patient-DenExclPass-DctoHomeHospiceInptEncEndsDuringMP.json",
      "patient-DenExclPass-HospiceOrderDuringMP.json",
      "patient-DenExclPass-HospicePerformedOverlapsMP.json",
      "patient-DenExclPass-HPVless5YrsB4EndMP.json",
      "patient-DenExclPass-HPVless5YrsB4EndMP_1.json",
      "patient-DenExclPass-HPVless5YrsB4EndMP_2.json",
      "patient-DenExclPass-HPVless5YrsB4EndMP_3.json",
      "patient-DenExclPass-HystB4EndOfMP.json",
      "patient-NumPass-Papless3YrsB4EndMP.json",
      "patient-NumPass-Papless3YrsB4EndMP_1.json",
      "patient-NumPass-Papless3YrsB4EndMP_2.json",
      "patient-NumPass-Papless3YrsB4EndMP_3.json"
    ];
    const patients = [];
    patientFiles.forEach((file) =>
      patients.push(getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/" + file))
    );

    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(patientFiles.length);
    // expect(Object.keys(calculationResults).length).toEqual(14);

    for (let resNo = 0; resNo < patientFiles.length; resNo++) {
      const id = Object.keys(calculationResults)[resNo];

      const calculationResult = calculationResults[id];
      expect(Object.keys(calculationResult)).toEqual(["PopulationSet_1"]);
      const result = Object.values(calculationResult)[0];

      const patient = patients[resNo];

      expect(id).toEqual(patient.id);
      expect(result.IPP).toEqual(patient.expected_values[0].IPP);
      expect(result.DENOM).toEqual(patient.expected_values[0].DENOM);
      expect(result.NUMER).toEqual(patient.expected_values[0].NUMER);
      expect(result.DENEX).toEqual(patient.expected_values[0].DENEX);
    }
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
    expect(result.statement_relevance.EXM124['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].final).toBe('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].raw).toBe(true);
  });

  it("calculates a cqm-patient generated in Bonnie that satisfies IPP", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/EXM124TEST.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CVFHIREXM124TESTMEASURE001/bonnie-patient.json"));

    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

    expect(result.IPP).toEqual(1);
    expect(result.statement_relevance.EXM124['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].final).toBe('TRUE');
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
    expect(result.statement_relevance.EXM124['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].final).toBe('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].raw).toBe(true);
    expect(result.statement_results.EXM124['Denominator'].final).toBe('TRUE');
    expect(result.statement_results.EXM124['Denominator'].raw).toBe(true);
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
      NUMER: false,
    });
    expect(result.clause_results).toBeNull();
    expect(result.state).toEqual("complete");
    expect(result.IPP).toEqual(1);
    expect(result.DENEX).toEqual(1);
    expect(result.DENOM).toEqual(1);
    expect(result.NUMER).toEqual(0);
    expect(result.patient).toEqual("denomexcl-EXM124");
    expect(result.statement_relevance.EXM124['Initial Population']).toEqual('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].final).toBe('TRUE');
    expect(result.statement_results.EXM124['Initial Population'].raw).toBe(true);
  });
});
