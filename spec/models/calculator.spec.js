/* eslint dot-notation: 0 */ // --> OFF
/* eslint quote-props: 0 */ // --> OFF

const Calculator = require("../../lib/models/calculator.js");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe.skip("Calculator", () => {
  describe("episode of care based relevance map", () => {
    it("is correct for patient with no episodes", () => {
      const valueSets = getJSONFixture("cqm_measures/CMS107v6/value_sets.json");
      const measure = getJSONFixture("cqm_measures/CMS107v6/CMS107v6.json");
      const patients = [];
      patients.push(getJSONFixture("patients/CMS107v6/IPPFail_LOS=121Days.json"));
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // No results will be in the episode_results
      expect(result["episode_results"]).toEqual({});
      // The IPP should be the only relevant population
      expect(result.population_relevance).toEqual({
        IPP: true,
        DENOM: false,
        DENEX: false,
        NUMER: false,
      });
    });
  });

  describe("patient based relevance map", () => {
    it.skip("is correct", () => {
      const valueSets = getJSONFixture("cqm_measures/CMS735v0/value_sets.json");
      const measure = getJSONFixture("cqm_measures/CMS735v0/CMS735v0.json");
      const patients = [];
      patients.push(getJSONFixture("patients/CMS735v0/first_last.json"));
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // There will not be episode_results on the result object
      expect(result["episode_results"]).toBeUndefined();
      // The IPP should be the only relevant population
      expect(result.population_relevance).toEqual({
        IPP: true,
        DENOM: false,
        DENEX: false,
        NUMER: false,
        DENEXCEP: false,
      });
    });
  });

  describe("execution engine using default timezone offset", () => {
    it.skip("is correct", () => {
      const valueSets = getJSONFixture("cqm_measures/CMS760v0/value_sets.json");
      const measure = getJSONFixture("cqm_measures/CMS760v0/CMS760v0.json");
      const patients = [];
      patients.push(getJSONFixture("patients/CMS760v0/Correct_Timezone.json"));
      const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The IPP should not be in the IPP
      expect(result.IPP).toEqual(0);
    });
  });

  describe("execution engine using passed in timezone offset and bad effective_date", () => {
    it.skip("is correct", () => {
      const valueSets = getJSONFixture("cqm_measures/CMS760v0/value_sets.json");
      const measure = getJSONFixture("cqm_measures/CMS760v0/CMS760v0.json");
      const patients = [];
      patients.push(getJSONFixture("patients/CMS760v0/Correct_Timezone.json"));
      const calculationResults = Calculator.calculate(measure, patients, valueSets, {
        effective_date: "201701010000",
        timezone_offset: -4,
        requestDocument: true,
      });
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];

      // The patient should be in the IPP now that the end of the measure period is 4 hours in the future
      expect(result.IPP).toEqual(0);
    });
  });

  it.skip("multiple population measure correctly", () => {
    const valueSets = getJSONFixture("cqm_measures/CMS160v6/value_sets.json");
    const measure = getJSONFixture("cqm_measures/CMS160v6/CMS160v6.json");
    const expiredDenex = getJSONFixture("patients/CMS160v6/Expired_DENEX.json");
    const passNumer2 = getJSONFixture("patients/CMS160v6/Pass_NUM2.json");
    const patients = [];
    patients.push(expiredDenex);
    patients.push(passNumer2);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
    const expiredDenexResults = calculationResults[Object.keys(calculationResults)[0]];
    const passNumer2Results = calculationResults[Object.keys(calculationResults)[1]];

    // Patient expiredDenexResults Population Set 1
    expect(expiredDenexResults["PopulationCriteria1"].IPP).toBe(1);
    expect(expiredDenexResults["PopulationCriteria1"].DENOM).toBe(1);
    expect(expiredDenexResults["PopulationCriteria1"].DENEX).toBe(1);
    expect(expiredDenexResults["PopulationCriteria1"].NUMER).toBe(0);
    // Patient expiredDenexResults Population Set 2
    expect(expiredDenexResults["PopulationCriteria2"].IPP).toBe(0);
    expect(expiredDenexResults["PopulationCriteria2"].DENOM).toBe(0);
    expect(expiredDenexResults["PopulationCriteria2"].DENEX).toBe(0);
    expect(expiredDenexResults["PopulationCriteria2"].NUMER).toBe(0);
    // Patient expiredDenexResults Population Set 3
    expect(expiredDenexResults["PopulationCriteria3"].IPP).toBe(0);
    expect(expiredDenexResults["PopulationCriteria3"].DENOM).toBe(0);
    expect(expiredDenexResults["PopulationCriteria3"].DENEX).toBe(0);
    expect(expiredDenexResults["PopulationCriteria3"].NUMER).toBe(0);

    // Patient passNumer2Results Population Set 1
    expect(passNumer2Results["PopulationCriteria1"].IPP).toBe(0);
    expect(passNumer2Results["PopulationCriteria1"].DENOM).toBe(0);
    expect(passNumer2Results["PopulationCriteria1"].DENEX).toBe(0);
    expect(passNumer2Results["PopulationCriteria1"].NUMER).toBe(0);
    // Patient passNumer2Results Population Set 2
    expect(passNumer2Results["PopulationCriteria2"].IPP).toBe(1);
    expect(passNumer2Results["PopulationCriteria2"].DENOM).toBe(1);
    expect(passNumer2Results["PopulationCriteria2"].DENEX).toBe(0);
    expect(passNumer2Results["PopulationCriteria2"].NUMER).toBe(1);
    // Patient passNumer2Results Population Set 3
    expect(passNumer2Results["PopulationCriteria3"].IPP).toBe(0);
    expect(passNumer2Results["PopulationCriteria3"].DENOM).toBe(0);
    expect(passNumer2Results["PopulationCriteria3"].DENEX).toBe(0);
    expect(passNumer2Results["PopulationCriteria3"].NUMER).toBe(0);
  });

  it.skip("multiple population and stratification measure correctly", () => {
    const valueSets = getJSONFixture("cqm_measures/CMS160v7/value_sets.json");
    const measure = getJSONFixture("cqm_measures/CMS160v7/CMS160v7.json");
    const numPass = getJSONFixture("patients/CMS160v7/PHQ9EBEDec_PerDzDxSAEDec_NUM1Pass.json");
    const patients = [];
    patients.push(numPass);
    const options = { doPretty: true, requestDocument: true };
    const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
    const numPassResults = calculationResults[Object.keys(calculationResults)[0]];

    // Patient expiredDenexResults Population Set 1
    const pop2Strat1 = numPassResults["PopulationCriteria2"];
    const pop2Strat1StatementResults = pop2Strat1.statement_results_by_statement().DepressionUtilizationofthePHQ9Tool;
    expect(pop2Strat1StatementResults["May through August of Measurement Period"].pretty).toBe("INTERVAL: 05/01/2012 12:00 AM - 09/01/2012 12:00 AM");
  });

  it.skip("single population patient-based measure correctly", () => {
    const valueSets = getJSONFixture("cqm_measures/CMS134v6/value_sets.json");
    const measure = getJSONFixture("cqm_measures/CMS134v6/CMS134v6.json");
    const failHospiceNotPerformedDenex = getJSONFixture("patients/CMS134v6/Fail_Hospice_Not_Performed_Denex.json");
    const passNumer = getJSONFixture("patients/CMS134v6/Pass_Numer.json");
    const patients = [];
    patients.push(failHospiceNotPerformedDenex);
    patients.push(passNumer);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
    const failHospiceNotPerformedDenexResults = calculationResults[Object.keys(calculationResults)[0]];
    const passNumerResults = calculationResults[Object.keys(calculationResults)[1]];

    expect(failHospiceNotPerformedDenexResults["PopulationCriteria1"].IPP).toBe(1);
    expect(failHospiceNotPerformedDenexResults["PopulationCriteria1"].DENOM).toBe(1);
    expect(failHospiceNotPerformedDenexResults["PopulationCriteria1"].DENEX).toBe(0);
    expect(failHospiceNotPerformedDenexResults["PopulationCriteria1"].NUMER).toBe(0);

    expect(passNumerResults["PopulationCriteria1"].IPP).toBe(1);
    expect(passNumerResults["PopulationCriteria1"].DENOM).toBe(1);
    expect(passNumerResults["PopulationCriteria1"].DENEX).toBe(0);
    expect(passNumerResults["PopulationCriteria1"].NUMER).toBe(1);
  });

  it.skip("measure that calculates supplemental data elements correctly", () => {
    const valueSets = getJSONFixture("cqm_measures/CMS529v0/value_sets.json");
    const measure = getJSONFixture("cqm_measures/CMS529v0/CMS529v0.json");
    const passIppDenomNumer = getJSONFixture("patients/CMS529v0/Pass_IPP-DENOM-NUMER.json");
    const patients = [];
    patients.push(passIppDenomNumer);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });
    const passIppDenomNumerResults = calculationResults[Object.keys(calculationResults)[0]];

    expect(passIppDenomNumerResults["PopulationCriteria1"].IPP).toBe(1);
    expect(passIppDenomNumerResults["PopulationCriteria1"].DENOM).toBe(1);
    expect(passIppDenomNumerResults["PopulationCriteria1"].NUMER).toBe(1);
  });

  it.skip("multiple populations with multiple stratifications measure correctly", () => {
    const valueSets = getJSONFixture("cqm_measures/CMS137v7/value_sets.json");
    const measure = getJSONFixture("cqm_measures/CMS137v7/CMS137v7.json");
    const ippPopFail = getJSONFixture("patients/CMS137v7/2YoungDependence&TX_IPPPopFail.json");
    const denexPop18StratPass = getJSONFixture("patients/CMS137v7/Dependency<60daysSB4_DENEXPop>18StratPass.json");
    const pop1Pass = getJSONFixture("patients/CMS137v7/Therapy<14DaysDx_NUMERPop1_13-18Pass.json");
    const patients = [];
    patients.push(ippPopFail);
    patients.push(denexPop18StratPass);
    patients.push(pop1Pass);
    const calculationResults = Calculator.calculate(measure, patients, valueSets, { requestDocument: true });

    const ippPopFailResults = calculationResults[Object.keys(calculationResults)[0]];
    const denexPop18StratPassResults = calculationResults[Object.keys(calculationResults)[1]];
    const pop1PassResults = calculationResults[Object.keys(calculationResults)[2]];

    // Patient ippPopFail results
    expect(ippPopFailResults["PopulationCriteria1"].IPP).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1"].DENOM).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1"].NUMER).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1"].DENEX).toBe(0);

    expect(ippPopFailResults["PopulationCriteria1 - Stratification 1"].IPP).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1 - Stratification 1"].DENOM).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1 - Stratification 1"].NUMER).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1 - Stratification 1"].DENEX).toBe(0);

    expect(ippPopFailResults["PopulationCriteria1 - Stratification 2"].IPP).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1 - Stratification 2"].DENOM).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1 - Stratification 2"].NUMER).toBe(0);
    expect(ippPopFailResults["PopulationCriteria1 - Stratification 2"].DENEX).toBe(0);

    expect(ippPopFailResults["PopulationCriteria2"].IPP).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2"].DENOM).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2"].NUMER).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2"].DENEX).toBe(0);

    expect(ippPopFailResults["PopulationCriteria2 - Stratification 1"].IPP).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2 - Stratification 1"].DENOM).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2 - Stratification 1"].NUMER).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2 - Stratification 1"].DENEX).toBe(0);

    expect(ippPopFailResults["PopulationCriteria2 - Stratification 2"].IPP).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2 - Stratification 2"].DENOM).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2 - Stratification 2"].NUMER).toBe(0);
    expect(ippPopFailResults["PopulationCriteria2 - Stratification 2"].DENEX).toBe(0);

    // Patient denexPop18StratPassResults
    expect(denexPop18StratPassResults["PopulationCriteria1"].IPP).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria1"].DENOM).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria1"].NUMER).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria1"].DENEX).toBe(1);

    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 1"].IPP).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 1"].DENOM).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 1"].NUMER).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 1"].DENEX).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 1"].STRAT).toBe(0);

    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 2"].IPP).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 2"].DENOM).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 2"].NUMER).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 2"].DENEX).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria1 - Stratification 2"].STRAT).toBe(1);

    expect(denexPop18StratPassResults["PopulationCriteria2"].IPP).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria2"].DENOM).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria2"].NUMER).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria2"].DENEX).toBe(1);

    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 1"].IPP).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 1"].DENOM).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 1"].NUMER).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 1"].DENEX).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 1"].STRAT).toBe(0);

    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 2"].IPP).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 2"].DENOM).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 2"].NUMER).toBe(0);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 2"].DENEX).toBe(1);
    expect(denexPop18StratPassResults["PopulationCriteria2 - Stratification 2"].STRAT).toBe(1);

    // Patient pop1PassResults
    expect(pop1PassResults["PopulationCriteria1"].IPP).toBe(1);
    expect(pop1PassResults["PopulationCriteria1"].DENOM).toBe(1);
    expect(pop1PassResults["PopulationCriteria1"].NUMER).toBe(1);
    expect(pop1PassResults["PopulationCriteria1"].DENEX).toBe(0);

    expect(pop1PassResults["PopulationCriteria1 - Stratification 1"].IPP).toBe(1);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 1"].DENOM).toBe(1);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 1"].NUMER).toBe(1);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 1"].DENEX).toBe(0);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 1"].STRAT).toBe(1);

    expect(pop1PassResults["PopulationCriteria1 - Stratification 2"].IPP).toBe(0);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 2"].DENOM).toBe(0);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 2"].NUMER).toBe(0);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 2"].DENEX).toBe(0);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 2"].STRAT).toBe(0);

    expect(pop1PassResults["PopulationCriteria2"].IPP).toBe(1);
    expect(pop1PassResults["PopulationCriteria2"].DENOM).toBe(1);
    expect(pop1PassResults["PopulationCriteria2"].NUMER).toBe(0);
    expect(pop1PassResults["PopulationCriteria2"].DENEX).toBe(0);

    expect(pop1PassResults["PopulationCriteria2 - Stratification 1"].IPP).toBe(1);
    expect(pop1PassResults["PopulationCriteria2 - Stratification 1"].DENOM).toBe(1);
    expect(pop1PassResults["PopulationCriteria2 - Stratification 1"].NUMER).toBe(0);
    expect(pop1PassResults["PopulationCriteria2 - Stratification 1"].DENEX).toBe(0);
    expect(pop1PassResults["PopulationCriteria1 - Stratification 1"].STRAT).toBe(1);

    expect(pop1PassResults["PopulationCriteria2 - Stratification 2"].IPP).toBe(0);
    expect(pop1PassResults["PopulationCriteria2 - Stratification 2"].DENOM).toBe(0);
    expect(pop1PassResults["PopulationCriteria2 - Stratification 2"].NUMER).toBe(0);
    expect(pop1PassResults["PopulationCriteria2 - Stratification 2"].DENEX).toBe(0);
    expect(pop1PassResults["PopulationCriteria2 - Stratification 2"].STRAT).toBe(0);
  });

  describe("opioid measure", () => {
    it.skip("results have correct indentation", () => {
      const valueSets = getJSONFixture("cqm_measures/CMS460v0/value_sets.json");
      const measure = getJSONFixture("cqm_measures/CMS460v0/CMS460v0.json");
      const patients = [];
      patients.push(getJSONFixture("patients/CMS460v0/Opioid_Test.json"));
      patients.push(getJSONFixture("patients/CMS460v0/MethadoneLessThan90MME_NUMERFail.json"));
      const options = { doPretty: true, requestDocument: true };
      const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
      const result = Object.values(calculationResults[Object.keys(calculationResults)[0]])[0];
      const conversionFactorResult = Object.values(calculationResults[Object.keys(calculationResults)[1]])[0];
      const indentedResult =
        "[{" +
        "\n  cmd: 233," +
        "\n  meds: [Medication, Order: Opioid Medications" +
        "\n        START: 05/09/2012 8:00 AM" +
        "\n        STOP: 12/28/2012 8:15 AM" +
        "\n        CODE: RxNorm 1053647]," +
        "\n  period: INTERVAL: 05/09/2012 8:00 AM - 12/28/2012 8:15 AM" +
        "\n}]";
      const resultsByStatement = result.statement_results_by_statement();
      const conversionFactorResultsByStatement = conversionFactorResult.statement_results_by_statement();

      expect(
        resultsByStatement["PotentialOpioidOveruse"]["Periods With and Without 7 Day Gap With Cumulative Med Duration 90 days or Greater"]["pretty"]
      ).toEqual(indentedResult);
      expect(conversionFactorResultsByStatement["PotentialOpioidOveruse"]["Prescriptions with MME"]["pretty"]).toContain("conversionFactor: 4,");
    });
  });

  describe("results include clause results", () => {
    it.skip("only if requested with document", () => {
      const valueSets = getJSONFixture("cqm_measures/CMS760v0/value_sets.json");
      const measure = getJSONFixture("cqm_measures/CMS760v0/CMS760v0.json");
      const patients = [getJSONFixture("patients/CMS760v0/Correct_Timezone.json")];
      const calculationResultsNoClauses = Calculator.calculate(measure, patients, valueSets, {
        includeClauseResults: false,
        requestDocument: true,
      });
      const resultNoClauses = Object.values(calculationResultsNoClauses[Object.keys(calculationResultsNoClauses)[0]])[0];

      const calculationResultsWithClauses = Calculator.calculate(measure, patients, valueSets, {
        includeClauseResults: true,
        requestDocument: true,
      });
      const resultWithClauses = Object.values(calculationResultsWithClauses[Object.keys(calculationResultsWithClauses)[0]])[0];

      expect(resultNoClauses.clause_results).toEqual(null);
      expect(resultWithClauses.clause_results).toEqual(jasmine.any(Array));
    });

    it("only if requested without document", () => {
      const valueSets = getJSONFixture("cqm_measures/CMS760v0/value_sets.json");
      const measure = getJSONFixture("cqm_measures/CMS760v0/CMS760v0.json");
      const patients = [getJSONFixture("patients/CMS760v0/Correct_Timezone.json")];
      const calculationResultsNoClauses = Calculator.calculate(measure, patients, valueSets, {
        includeClauseResults: false,
        requestDocument: false,
      });
      const resultNoClauses = Object.values(calculationResultsNoClauses[Object.keys(calculationResultsNoClauses)[0]])[0];

      const calculationResultsWithClauses = Calculator.calculate(measure, patients, valueSets, {
        includeClauseResults: true,
      });
      const resultWithClauses = Object.values(calculationResultsWithClauses[Object.keys(calculationResultsWithClauses)[0]])[0];

      expect(resultNoClauses.clause_results).toEqual(null);
      expect(resultWithClauses.clause_results).toEqual(jasmine.any(Object));
    });
  });
});
