const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.EXM124TEST", () => {
  it("Run patients", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS111Simplified/CMS111.json");
    // const measure = getJSONFixture("fhir_cqm_measures/JK124/EXM124.json");
    const valueSets = measure.value_sets;
    const patientFiles = ["random-patient.json", "IPP_MSRPOPL_PASS_TEST.json", "IPP_MSRPOPL_MSRPOPEX_NO_OBS.json"];
    const patients = [];
    patientFiles.forEach((file) => patients.push(getJSONFixture("fhir_cqm_measures/CMS111Simplified/" + file)));

    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(patientFiles.length);

    for (let resNo = 0; resNo < patientFiles.length; resNo++) {
      const id = Object.keys(calculationResults)[resNo];

      const calculationResult = calculationResults[id];
      expect(Object.keys(calculationResult)).toEqual(["PopulationSet_1", "PopulationSet_1_Stratification_1", "PopulationSet_1_Stratification_2"]);
      const result = Object.values(calculationResult)[0];

      const patient = patients[resNo];

      expect(id).toEqual(patient.id);
      expect(result.IPP).toEqual(patient.expected_values[0].IPP);
      expect(result.DENOM).toEqual(patient.expected_values[0].DENOM);
      expect(result.NUMER).toEqual(patient.expected_values[0].NUMER);
      expect(result.DENEX).toEqual(patient.expected_values[0].DENEX);
    }
  });
});
