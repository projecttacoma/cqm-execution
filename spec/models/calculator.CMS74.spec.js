const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("Calculator.CMS74", () => {
  it("calculates denom patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-denom-EXM74-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual([
      "PopulationSet_1",
      "PopulationSet_1_Stratification_1",
      "PopulationSet_1_Stratification_2",
      "PopulationSet_1_Stratification_3",
    ]);
    expect(Object.keys(calculationResults).length).toEqual(1);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    // The IPP should be the only relevant population
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(0);
    expect(result1.patient).toEqual("denom-EXM74");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    // The IPP should be the only relevant population
    expect(result2.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      NUMER: false,
      DENEX: false,
      STRAT: true,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(0);
    expect(result2.patient).toEqual("denom-EXM74");

    const result3 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result3["episode_results"]).toBeUndefined();
    // The IPP should be the only relevant population
    expect(result3.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result3.clause_results).toBeNull();
    expect(result3.state).toEqual("complete");
    expect(result3.IPP).toEqual(0);
    expect(result3.patient).toEqual("denom-EXM74");

    const result4 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[3];
    expect(result4["episode_results"]).toBeUndefined();
    // The IPP should be the only relevant population
    expect(result4.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result4.clause_results).toBeNull();
    expect(result4.state).toEqual("complete");
    expect(result4.IPP).toEqual(0);
    expect(result4.patient).toEqual("denom-EXM74");
  });

  it("calculates denomexcl patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-denomexcl-EXM74-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual([
      "PopulationSet_1",
      "PopulationSet_1_Stratification_1",
      "PopulationSet_1_Stratification_2",
      "PopulationSet_1_Stratification_3",
    ]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    // There will not be episode_results on the result1 object
    expect(result1["episode_results"]).toBeUndefined();
    // The IPP should be the only relevant population
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(0);
    expect(result1.patient).toEqual("denomexcl-EXM74");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      NUMER: false,
      DENEX: false,
      STRAT: true,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(0);
    expect(result2.patient).toEqual("denomexcl-EXM74");

    const result3 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result3["episode_results"]).toBeUndefined();
    expect(result3.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result3.clause_results).toBeNull();
    expect(result3.state).toEqual("complete");
    expect(result3.IPP).toEqual(0);
    expect(result3.patient).toEqual("denomexcl-EXM74");

    const result4 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[3];
    expect(result4["episode_results"]).toBeUndefined();
    expect(result4.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result4.clause_results).toBeNull();
    expect(result4.state).toEqual("complete");
    expect(result4.IPP).toEqual(0);
    expect(result4.patient).toEqual("denomexcl-EXM74");
  });

  it("calculates numer-strat1 patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat1-EXM74-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual([
      "PopulationSet_1",
      "PopulationSet_1_Stratification_1",
      "PopulationSet_1_Stratification_2",
      "PopulationSet_1_Stratification_3",
    ]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(0);
    expect(result1.patient).toEqual("numer-strat1-EXM74");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      NUMER: false,
      DENEX: false,
      STRAT: true,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(0);
    expect(result2.patient).toEqual("numer-strat1-EXM74");

    const result3 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result3["episode_results"]).toBeUndefined();
    expect(result3.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result3.clause_results).toBeNull();
    expect(result3.state).toEqual("complete");
    expect(result3.IPP).toEqual(0);
    expect(result3.patient).toEqual("numer-strat1-EXM74");

    const result4 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[3];
    expect(result4["episode_results"]).toBeUndefined();
    expect(result4.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result4.clause_results).toBeNull();
    expect(result4.state).toEqual("complete");
    expect(result4.IPP).toEqual(0);
    expect(result4.patient).toEqual("numer-strat1-EXM74");
  });

  it("calculates numer-strat2 patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat2-EXM74-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual([
      "PopulationSet_1",
      "PopulationSet_1_Stratification_1",
      "PopulationSet_1_Stratification_2",
      "PopulationSet_1_Stratification_3",
    ]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(0);
    expect(result1.patient).toEqual("numer-strat2-EXM74");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      NUMER: false,
      DENEX: false,
      STRAT: true,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(0);
    expect(result2.patient).toEqual("numer-strat2-EXM74");

    const result3 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result3["episode_results"]).toBeUndefined();
    expect(result3.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result3.clause_results).toBeNull();
    expect(result3.state).toEqual("complete");
    expect(result3.IPP).toEqual(0);
    expect(result3.patient).toEqual("numer-strat2-EXM74");

    const result4 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[3];
    expect(result4["episode_results"]).toBeUndefined();
    expect(result4.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result4.clause_results).toBeNull();
    expect(result4.state).toEqual("complete");
    expect(result4.IPP).toEqual(0);
    expect(result4.patient).toEqual("numer-strat2-EXM74");
  });

  it("calculates numer-strat3 patient", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat3-EXM74-cqm-patient.json"));
    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults).length).toEqual(1);
    expect(Object.keys(calculationResults[Object.keys(calculationResults)[0]])).toEqual([
      "PopulationSet_1",
      "PopulationSet_1_Stratification_1",
      "PopulationSet_1_Stratification_2",
      "PopulationSet_1_Stratification_3",
    ]);

    const result1 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
    expect(result1["episode_results"]).toBeUndefined();
    expect(result1.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
    });
    expect(result1.clause_results).toBeNull();
    expect(result1.state).toEqual("complete");
    expect(result1.IPP).toEqual(0);
    expect(result1.patient).toEqual("numer-strat3-EXM74");

    const result2 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[1];
    expect(result2["episode_results"]).toBeUndefined();
    expect(result2.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      NUMER: false,
      DENEX: false,
      STRAT: true,
    });
    expect(result2.clause_results).toBeNull();
    expect(result2.state).toEqual("complete");
    expect(result2.IPP).toEqual(0);
    expect(result2.patient).toEqual("numer-strat3-EXM74");

    const result3 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[2];
    expect(result3["episode_results"]).toBeUndefined();
    expect(result3.population_relevance).toEqual({
      IPP: false,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result3.clause_results).toBeNull();
    expect(result3.state).toEqual("complete");
    expect(result3.IPP).toEqual(0);
    expect(result3.patient).toEqual("numer-strat3-EXM74");

    const result4 = Object.values(calculationResults[Object.keys(calculationResults)[0]])[3];
    expect(result4["episode_results"]).toBeUndefined();
    expect(result4.population_relevance).toEqual({
      IPP: true,
      DENOM: false,
      DENEX: false,
      NUMER: false,
      STRAT: true,
    });
    expect(result4.clause_results).toBeNull();
    expect(result4.state).toEqual("complete");
    expect(result4.IPP).toEqual(0);
    expect(result4.patient).toEqual("numer-strat3-EXM74");
  });

  it("can handle several patients at the same time", () => {
    const measure = getJSONFixture("fhir_cqm_measures/CMS74/CMS74.json");
    const valueSets = measure.value_sets;
    const patients = [];
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-denom-EXM74-cqm-patient.json"));
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-denomexcl-EXM74-cqm-patient.json"));
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat1-EXM74-cqm-patient.json"));
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat2-EXM74-cqm-patient.json"));
    patients.push(getJSONFixture("fhir_cqm_measures/CMS74/tests-numer-strat3-EXM74-cqm-patient.json"));

    const calculationResults = Calculator.calculate(measure, patients, valueSets, {});
    expect(Object.keys(calculationResults)).toEqual(["denom-EXM74", "denomexcl-EXM74", "numer-strat1-EXM74", "numer-strat2-EXM74", "numer-strat3-EXM74"]);

    for (const patient of Object.keys(calculationResults)) {
      expect(Object.keys(calculationResults[patient])).toEqual([
        "PopulationSet_1",
        "PopulationSet_1_Stratification_1",
        "PopulationSet_1_Stratification_2",
        "PopulationSet_1_Stratification_3",
      ]);
    }
  });
});
