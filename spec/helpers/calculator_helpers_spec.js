const CalculatorHelpers = require('../../lib/helpers/calculator_helpers.js');

describe('CalculatorHelpers', () => {
  describe('handlePopulationValues', () => {
    it('NUMER population not modified by inclusion in NUMEX', () => {
      initial_results = {IPP: 1, DENOM: 1, DENEX: 0, NUMER: 1, NUMEX: 1};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(initial_results);
    });

    it('NUMEX membership removed when not a member of NUMER', () => {
      initial_results = {IPP: 1, DENOM: 1, DENEX: 0, NUMER: 0, NUMEX: 1};
      expected_results = {IPP: 1, DENOM: 1, DENEX: 0, NUMER: 0, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('NUMEX membership removed when not a member of DENOM', () => {
      initial_results = {IPP: 1, DENOM: 0, DENEX: 0, NUMER: 0, NUMEX: 1};
      expected_results = {IPP: 1, DENOM: 0, DENEX: 0, NUMER: 0, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('DENOM population not modified by inclusion in DENEX', () => {
      initial_results = {IPP: 1, DENOM: 1, DENEX: 1, NUMER: 0, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(initial_results);
    });

    it('DENEX membership removed when not a member of DENOM', () => {
      initial_results = {IPP: 1, DENOM: 0, DENEX: 1, NUMER: 0, NUMEX: 0};
      expected_results = {IPP: 1, DENOM: 0, DENEX: 0, NUMER: 0, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('MSRPOPLEX should be 0 if MSRPOPL not satisfied', () => {
      initial_results = {IPP: 1, MSRPOPL: 0, MSRPOPLEX: 1};
      expected_results = {IPP: 1, MSRPOPL: 0, MSRPOPLEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);

      initial_results = {IPP: 1, MSRPOPL: 0, MSRPOPLEX: 0};
      expected_results = {IPP: 1, MSRPOPL: 0, MSRPOPLEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('MSRPOPLEX should be unchanged if MSRPOPL satisfied', () => {
      initial_results = {IPP: 1, MSRPOPL: 1, MSRPOPLEX: 1};
      expected_results = {IPP: 1, MSRPOPL: 1, MSRPOPLEX: 1};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);

      initial_results = {IPP: 1, MSRPOPL: 1, MSRPOPLEX: 0};
      expected_results = {IPP: 1, MSRPOPL: 1, MSRPOPLEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('NUMER and NUMEX membership removed there are same counts in DENEX as DENOM', () => {
      initial_results = {IPP: 2, DENOM: 2, DENEX: 2, NUMER: 2, NUMEX: 1};
      expected_results = {IPP: 2, DENOM: 2, DENEX: 2, NUMER: 0, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('NUMER and NUMEX membership removed there are more counts in DENEX than DENOM', () => {
      initial_results = {IPP: 3, DENOM: 2, DENEX: 3, NUMER: 2, NUMEX: 1};
      expected_results = {IPP: 3, DENOM: 2, DENEX: 3, NUMER: 0, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('NUMER and NUMEX membership kept if there are less counts in DENEX as DENOM', () => {
      initial_results = {IPP: 2, DENOM: 2, DENEX: 1, NUMER: 1, NUMEX: 0};
      expected_results = {IPP: 2, DENOM: 2, DENEX: 1, NUMER: 1, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });

    it('DENEXCEP and NUMER membership removed if a member of DENEX', () => {
      initial_results = {IPP: 1, DENOM: 1, DENEX: 1, DENEXCEP: 1, NUMER: 1, NUMEX: 0};
      expected_results = {IPP: 1, DENOM: 1, DENEX: 1, DENEXCEP: 0, NUMER: 0, NUMEX: 0};
      processed_results = CalculatorHelpers.handlePopulationValues(initial_results);
      expect(processed_results).toEqual(expected_results);
    });
  });
});