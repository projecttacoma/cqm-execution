const CalculatorHelpers = require('../../lib/helpers/calculator_helpers.js');

describe('CalculatorHelpers', () => {
  describe('handlePopulationValues', () => {
    it('NUMER population not modified by inclusion in NUMEX', () => {
      const initialResults = {
        IPP: 1,
        DENOM: 1,
        DENEX: 0,
        NUMER: 1,
        NUMEX: 1,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(initialResults);
    });

    it('NUMEX membership removed when not a member of NUMER', () => {
      const initialResults = {
        IPP: 1,
        DENOM: 1,
        DENEX: 0,
        NUMER: 0,
        NUMEX: 1,
      };
      const expectedResults = {
        IPP: 1,
        DENOM: 1,
        DENEX: 0,
        NUMER: 0,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('NUMEX membership removed when not a member of DENOM', () => {
      const initialResults = {
        IPP: 1,
        DENOM: 0,
        DENEX: 0,
        NUMER: 0,
        NUMEX: 1,
      };
      const expectedResults = {
        IPP: 1,
        DENOM: 0,
        DENEX: 0,
        NUMER: 0,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('DENOM population not modified by inclusion in DENEX', () => {
      const initialResults = {
        IPP: 1,
        DENOM: 1,
        DENEX: 1,
        NUMER: 0,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(initialResults);
    });

    it('DENEX membership removed when not a member of DENOM', () => {
      const initialResults = {
        IPP: 1,
        DENOM: 0,
        DENEX: 1,
        NUMER: 0,
        NUMEX: 0,
      };
      const expectedResults = {
        IPP: 1,
        DENOM: 0,
        DENEX: 0,
        NUMER: 0,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('MSRPOPLEX should be 0 if MSRPOPL not satisfied', () => {
      let initialResults = {
        IPP: 1,
        MSRPOPL: 0,
        MSRPOPLEX: 1,
      };
      let expectedResults = {
        IPP: 1,
        MSRPOPL: 0,
        MSRPOPLEX: 0,
      };
      let processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);

      initialResults = {
        IPP: 1,
        MSRPOPL: 0,
        MSRPOPLEX: 0,
      };
      expectedResults = {
        IPP: 1,
        MSRPOPL: 0,
        MSRPOPLEX: 0,
      };
      processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('MSRPOPLEX should be unchanged if MSRPOPL satisfied', () => {
      let initialResults = {
        IPP: 1,
        MSRPOPL: 1,
        MSRPOPLEX: 1,
      };
      let expectedResults = {
        IPP: 1,
        MSRPOPL: 1,
        MSRPOPLEX: 1,
      };
      let processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);

      initialResults = {
        IPP: 1,
        MSRPOPL: 1,
        MSRPOPLEX: 0,
      };
      expectedResults = {
        IPP: 1,
        MSRPOPL: 1,
        MSRPOPLEX: 0,
      };
      processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('NUMER and NUMEX membership removed there are same counts in DENEX as DENOM', () => {
      const initialResults = {
        IPP: 2,
        DENOM: 2,
        DENEX: 2,
        NUMER: 2,
        NUMEX: 1,
      };
      const expectedResults = {
        IPP: 2,
        DENOM: 2,
        DENEX: 2,
        NUMER: 0,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('NUMER and NUMEX membership removed there are more counts in DENEX than DENOM', () => {
      const initialResults = {
        IPP: 3,
        DENOM: 2,
        DENEX: 3,
        NUMER: 2,
        NUMEX: 1,
      };
      const expectedResults = {
        IPP: 3,
        DENOM: 2,
        DENEX: 3,
        NUMER: 0,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('NUMER and NUMEX membership kept if there are less counts in DENEX as DENOM', () => {
      const initialResults = {
        IPP: 2,
        DENOM: 2,
        DENEX: 1,
        NUMER: 1,
        NUMEX: 0,
      };
      const expectedResults = {
        IPP: 2,
        DENOM: 2,
        DENEX: 1,
        NUMER: 1,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });

    it('DENEXCEP and NUMER membership removed if a member of DENEX', () => {
      const initialResults = {
        IPP: 1,
        DENOM: 1,
        DENEX: 1,
        DENEXCEP: 1,
        NUMER: 1,
        NUMEX: 0,
      };
      const expectedResults = {
        IPP: 1,
        DENOM: 1,
        DENEX: 1,
        DENEXCEP: 0,
        NUMER: 0,
        NUMEX: 0,
      };
      const processedResults = CalculatorHelpers.handlePopulationValues(initialResults);
      expect(processedResults).toEqual(expectedResults);
    });
  });
});
