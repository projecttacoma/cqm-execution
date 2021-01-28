const CalculatorHelpers = require('../../lib/helpers/calculator_helpers.js');
const models = require("fhir-typescript-models");
const PopulationMap = models.PopulationMap;

describe('CalculatorHelpers', () => {

  describe("handle measurement period", () => {
    it("can parse measure period with seconds", () => {
      const parsed = CalculatorHelpers.parseTimeStringAsUTC("2021-12-31T23:59:59");
      expect(parsed.getUTCFullYear()).toEqual(2021);
      // Zero based month
      expect(parsed.getUTCMonth()).toEqual(11);
      expect(parsed.getUTCDate()).toEqual(31);
      expect(parsed.getUTCHours()).toEqual(23);
      expect(parsed.getUTCMinutes()).toEqual(59);
      expect(parsed.getUTCSeconds()).toEqual(59);
    });
  });

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

  describe("createPopulationValues", () => {
    it("run createPopulationValues", () => {
      const measure = {
        calculation_method: "EPISODE_OF_CARE"
      };
      const populations = new PopulationMap();
      populations.IPP = {
        statement_name: "stm1"
      };
      populations.observation_values = {
        statement_name: "stm2"
      }
      const populationSet = {
        populations,
        observations: [
          {}, {}
        ]
      };
      const patientResults = {
        "stm1": [
          {
            id: { value: "1" },
          }
        ],
        "stm2": [
          {
            id: { value: "2" },
          }
        ]
      };
      const observationDefs = [
        "stm1",
        "stm2"
      ];
      [populationResults, episodeResults] = CalculatorHelpers.createPopulationValues(
        measure,
        populationSet,
        patientResults,
        observationDefs
      );

      expect(populationResults).toEqual({ IPP: 1, observation_values: []});
      expect(episodeResults).toEqual({
        "1": {
          "IPP": 1,
          "observation_values": []
        }
      });
    });
  });

  describe("createEpisodePopulationValues", () => {
    it("test observations", () => {
      const populations = new PopulationMap();
      populations.IPP = {
        statement_name: "stm1"
      };
      populations.observation_values = [];
      const populationSet = {
        populations,
        observations: [
          {}, {}
        ]
      };
      const patientResults = {
        "stm1": [
          {
            id: { value: "1" },
            episode: {
              id: {
                value: "1"
              }
            },
            observation: {
            }
          }
        ],
        "stm2": [
          {
            id: { value: "2" },
            episode: {
              id: {
                value: "2"
              }
            },
            observation: {
            }
          }
        ]
      };
      const observationDefs = [
        "stm1",
        "stm2"
      ];
      CalculatorHelpers.createEpisodePopulationValues(populationSet, patientResults, observationDefs);
    });
  });

  describe("setValueSetVersionsToUndefined", () => {
    it("set version undefined to value sets", () => {
      const elm = [
        {
          library: {
            valueSets: {
              def: [
                {
                  version: 1
                },
                {
                  version: 2
                }
              ]
            }
          }
        },
        {
          library: {
            valueSets: {
              def: [
                {
                  version: 3
                },
                {
                  version: 4
                }
              ]
            }
          }
        }
      ];
      CalculatorHelpers.setValueSetVersionsToUndefined(elm);
      expect(elm[0].library.valueSets.def[0].version).toBeUndefined();
      expect(elm[0].library.valueSets.def[1].version).toBeUndefined();
      expect(elm[1].library.valueSets.def[0].version).toBeUndefined();
      expect(elm[1].library.valueSets.def[1].version).toBeUndefined();
    });
  })
});
