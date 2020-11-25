const MeasureHelpers = require("../../lib/helpers/measure_helpers");
const getJSONFixture = require("../support/spec_helper.js").getJSONFixture;

describe("MeasureHelpers", () => {
  describe("findAllLocalIdsInStatementByName", () => {
    it("finds localIds for library FunctionRefs while finding localIds in statements", () => {
      // Loads Anticoagulation Therapy for Atrial Fibrillation/Flutter measure.
      // This measure has the MAT global functions library included and the measure uses the
      // "CalendarAgeInYearsAt" function.
      const measure = getJSONFixture("cqm_measures/CMS723v0/CMS723v0.json");

      // Find the localid for the specific statement with the global function ref.
      const library = measure.cql_libraries.find(
        (lib) =>
          lib.library_name ===
          "AnticoagulationTherapyforAtrialFibrillationFlutter"
      );
      const statementName = "Encounter with Principal Diagnosis and Age";
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(
        library.elm,
        statementName
      );

      // For the fixture loaded for this test it is known that the library reference is 49 and the functionRef itself is 55.
      expect(localIds[49]).not.toBeUndefined();
      expect(localIds[49]).toEqual({ localId: "49", sourceLocalId: "55" });
    });

    it("finds localIds for library ExpressionRefs while finding localIds in statements", () => {
      // Loads Test104 aka. CMS13 measure.
      // This measure has both the TJC_Overall and MAT global libraries
      const measure = getJSONFixture("cqm_measures/CMS13v2/CMS13v2.json");

      // Find the localid for the specific statement with the global function ref.
      const library = measure.cql_libraries.find(
        (lib) => lib.library_name === "Test104"
      );
      const statementName = "Initial Population";
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(
        library.elm,
        statementName
      );

      // For the fixture loaded for this test it is known that the library reference is 109 and the functionRef itself is 110.
      expect(localIds[109]).not.toBeUndefined();
      expect(localIds[109]).toEqual({ localId: "109", sourceLocalId: "110" });
    });

    it("handles library ExpressionRefs with libraryRef embedded in the clause", () => {
      // Loads Test104 aka. CMS13 measure.
      // This measure has both the TJC_Overall and MAT global libraries
      const measure = getJSONFixture("cqm_measures/CMS13v2/CMS13v2.json");

      // Find the localid for the specific statement with the global function ref.
      const library = measure.cql_libraries.find(
        (lib) => lib.library_name === "Test104"
      );
      const statementName = "Comfort Measures during Hospitalization";
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(
        library.elm,
        statementName
      );

      // For the fixture loaded for this test it is known that the library reference is 109 and the functionRef itself is 110.
      expect(localIds[42]).not.toBeUndefined();
      expect(localIds[42]).toEqual({ localId: "42" });
    });

    it("clauses unsupported", () => {

      const library = {
        elm: {
          library: {
            identifier: {
              id: "666"
            },
            statements: {
              def: [
                {
                  name: "a statement",
                  type: "FunctionDef",
                  localId: "statement local id",
                  libraryName: "statement library name",
                  annotation: {
                    r: "statement local id",
                    s: [
                      {
                        s: {
                          value: [ "statement library id" ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      };

      const statementName = "a statement";

      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(
        library.elm,
        statementName
      );

      expect(localIds).toEqual({
           "statement local id": {
             "isUnsupported": true,
               "localId": "statement local id",
            }
       });
    });

    it("sort", () => {

      const libraryName = "statement library name";
      const statement = {
          name: "a statement",
          sort: {
            localId: "sort local id",
            other: {
              localId: "nested sort local id"
            },
            onemore: [
              {
                localIds: "deeply nested local id"
              }
            ]
          },
          localId: "statement local id",
          libraryName: "statement library name",
          annotation: {
            r: "statement local id",
            s: [
              {
                s: {
                  value: [ "statement library id" ]
                }
              }
            ]
          }
        };

      const statementName = "a statement";
      const aliasMap = {};

      const origLocalIds = [];
      const emptyResultClauses = [];
      const parentNode = {
        localId: "rootParentId"
      };
      const localIds = MeasureHelpers.findAllLocalIdsInStatement(
        statement,
        libraryName,
        statement.annotation,
        origLocalIds,
        aliasMap,
        emptyResultClauses,
        parentNode
      );

      expect(emptyResultClauses).toEqual([{"aliasLocalId": "sort local id", "expressionLocalId": "rootParentId", "lib": "statement library name"}]);
    });

    it("first", () => {

      const libraryName = "statement library name";
      const statement = {
        name: "a statement",
        type: "First",
        localId: "statement local id",
        libraryName: "statement library name",
        source: {
          localId: "source local id"
        },
        annotation: {
          r: "statement local id",
          s: [
            {
              s: {
                value: [ "statement library id" ]
              }
            }
          ]
        }
      };

      const statementName = "a statement";
      const aliasMap = {};

      const origLocalIds = [];
      const emptyResultClauses = [];
      const parentNode = {
        localId: "rootParentId"
      };
      const localIds = MeasureHelpers.findAllLocalIdsInStatement(
        statement,
        libraryName,
        statement.annotation,
        origLocalIds,
        aliasMap,
        emptyResultClauses,
        parentNode
      );

      expect(emptyResultClauses).toEqual([{ "aliasLocalId": "source local id", "expressionLocalId": "statement local id", "lib": "statement library name" }]);
    });

    it("last", () => {

      const libraryName = "statement library name";
      const statement = {
        name: "a statement",
        type: "Last",
        localId: "statement local id",
        libraryName: "statement library name",
        source: {
          localId: "source local id"
        },
        annotation: {
          r: "statement local id",
          s: [
            {
              s: {
                value: [ "statement library id" ]
              }
            }
          ]
        }
      };

      const statementName = "a statement";
      const aliasMap = {};

      const origLocalIds = [];
      const emptyResultClauses = [];
      const parentNode = {
        localId: "rootParentId"
      };
      const localIds = MeasureHelpers.findAllLocalIdsInStatement(
        statement,
        libraryName,
        statement.annotation,
        origLocalIds,
        aliasMap,
        emptyResultClauses,
        parentNode
      );

      expect(emptyResultClauses).toEqual([{ "aliasLocalId": "source local id", "expressionLocalId": "statement local id", "lib": "statement library name" }]);
    });

    it("return", () => {

      const libraryName = "statement library name";
      const statement = {
        name: "a statement",
        localId: "statement local id",
        libraryName: "statement library name",
        return: {
          localId: "return local id",
          expression: {
            localId: "return expression local id"
          }
        },
        annotation: {
          r: "statement local id",
          s: [
            {
              s: {
                value: [ "statement library id" ]
              }
            }
          ]
        }
      };

      const statementName = "a statement";
      const aliasMap = {};

      const origLocalIds = [];
      const emptyResultClauses = [];
      const parentNode = {
        localId: "rootParentId"
      };
      const localIds = MeasureHelpers.findAllLocalIdsInStatement(
        statement,
        libraryName,
        statement.annotation,
        origLocalIds,
        aliasMap,
        emptyResultClauses,
        parentNode
      );

      expect(emptyResultClauses).toEqual([{ "aliasLocalId": "return local id", "expressionLocalId": "return expression local id", "lib": "statement library name" }]);
    });

    it("let", () => {

      const libraryName = "statement library name";
      const statement = {
        name: "a statement",
        localId: "statement local id",
        libraryName: "statement library name",
        let: [
          {
            localId: "let local id 1",
            expression: {
              localId: "let 1 expression local id"
            }
          },
          {
            localId: "let local id 2",
            expression: {
              localId: "let 2 expression local id"
            }
          }
        ],
        annotation: {
          r: "statement local id",
          s: [
            {
              s: {
                value: [ "statement library id" ]
              }
            }
          ]
        }
      };

      const statementName = "a statement";
      const aliasMap = {};

      const localIds = {};
      const emptyResultClauses = [];
      const parentNode = {
        localId: "rootParentId"
      };
      MeasureHelpers.findAllLocalIdsInStatement(
        statement,
        libraryName,
        statement.annotation,
        localIds,
        aliasMap,
        emptyResultClauses,
        parentNode
      );

      expect(localIds).toEqual({"let 1 expression local id": {"localId": "let 1 expression local id"}, "let 2 expression local id": {"localId": "let 2 expression local id"}, "let local id 1": {"localId": "let local id 1", "sourceLocalId": "let 1 expression local id"}, "let local id 2": {"localId": "let local id 2", "sourceLocalId": "let 2 expression local id"}, "statement local id": {"localId": "statement local id"}});
    });

    it("asTypeSpecifier", () => {

      const libraryName = "statement library name";
      const statement = {
        name: "a statement",
        localId: "statement local id",
        libraryName: "statement library name",
        asTypeSpecifier: {
          localId: "13",
          expression: {
            localId: "return expression local id"
          }
        },
        annotation: {
          r: "statement local id",
          s: [
            {
              s: {
                value: [ "statement library id" ]
              }
            }
          ]
        }
      };

      const statementName = "a statement";
      const aliasMap = {};

      const origLocalIds = [];
      const emptyResultClauses = [];
      const parentNode = {
        localId: "rootParentId"
      };
      const localIds = MeasureHelpers.findAllLocalIdsInStatement(
        statement,
        libraryName,
        statement.annotation,
        origLocalIds,
        aliasMap,
        emptyResultClauses,
        parentNode
      );

      expect(emptyResultClauses).toEqual([{ "aliasLocalId": "13", "expressionLocalId": 12, "lib": "statement library name" }]);
    });
  });

  describe("findLocalIdForLibraryRef for functionRefs", () => {
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const measure = getJSONFixture("cqm_measures/CMS723v0/CMS723v0.json");

      // The annotation for the 'Encounter with Principal Diagnosis and Age' will be used for these tests
      // it is known the functionRef 'global.CalendarAgeInYearsAt' is a '55' and the libraryRef clause is at '49'
      this.annotationSnippet =
        measure.cql_libraries[0].elm.library.statements.def[6].annotation;
    });

    it("returns correct localId for functionRef if when found", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "55",
        "global"
      );
      expect(ret).toEqual("49");
    });

    it("returns null if it does not find the localId for the functionRef", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "23",
        "global"
      );
      expect(ret).toBeNull();
    });

    it("returns null if it does not find the proper libraryName for the functionRef", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "55",
        "notGlobal"
      );
      expect(ret).toBeNull();
    });

    it("returns null if annotation is empty", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        {},
        "55",
        "notGlobal"
      );
      expect(ret).toBeNull();
    });

    it("returns null if there is no value associated with annotation", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "68",
        "notGlobal"
      );
      expect(ret).toBeNull();
    });
  });

  describe("findLocalIdForLibraryRef for expressionRefs", () => {
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const measure = getJSONFixture("cqm_measures/CMS13v2/CMS13v2.json");

      // The annotation for the 'Initial Population' will be used for these tests
      // it is known the expressionRef 'TJC."Encounter with Principal Diagnosis and Age"' is '110' and the libraryRef
      // clause is at '109'
      this.annotationSnippet =
        measure.cql_libraries[0].elm.library.statements.def[12].annotation;
    });

    it("returns correct localId for expressionRef when found", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "110",
        "TJC"
      );
      expect(ret).toEqual("109");
    });

    it("returns null if it does not find the localId for the expressionRef", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "21",
        "TJC"
      );
      expect(ret).toBeNull();
    });

    it("returns null if it does not find the proper libraryName for the expressionRef", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "110",
        "notTJC"
      );
      expect(ret).toBeNull();
    });
  });

  describe("findLocalIdForLibraryRef for expressionRefs with libraryRef in clause", () => {
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const measure = getJSONFixture("cqm_measures/CMS13v2/CMS13v2.json");

      // The annotation for the 'Comfort Measures during Hospitalization' will be used for these tests
      // it is known the expressionRef 'TJC."Encounter with Principal Diagnosis of Ischemic Stroke"' is '42' and the
      // libraryRef is embedded in the clause without a localId of its own.
      this.annotationSnippet =
        measure.cql_libraries[0].elm.library.statements.def[8].annotation;
    });

    it("returns null for expressionRef when found yet it is embedded", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "42",
        "TJC"
      );
      expect(ret).toBeNull();
    });

    it("returns null if it does not find the proper libraryName for the expressionRef", () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(
        this.annotationSnippet,
        "42",
        "notTJC"
      );
      expect(ret).toBeNull();
    });
  });

  describe("isStatementFunction", () => {
    beforeEach(() => {
      this.library = {
        elm: {
          library: {
            statements: {
              def: [
                {
                  name: "statement1",
                  type: "FunctionDef"
                },
                {
                  name: "statement2",
                  type: "Other"
                },
                {
                  name: "statement3",
                  type: "FunctionDef"
                }
              ]
            }
          }
        }
      };
    });

    it("statement found for FunctionDef -> true", () => {
      const statementName = "statement1";
      expect(MeasureHelpers.isStatementFunction(this.library, statementName)).toBeTruthy();
    });

    it("statement2 found for not FunctionDef -> false", () => {
      const statementName = "statement2";
      expect(MeasureHelpers.isStatementFunction(this.library, statementName)).toBeFalsy();
    });

    it("statement not found -> false", () => {
      const statementName = "statement_not_found";
      expect(MeasureHelpers.isStatementFunction(this.library, statementName)).toBeFalsy();
    });
  });

  describe("isSupplementalDataElementStatement", () => {
    beforeEach(() => {
      this.populationSets = [
        {
          supplemental_data_elements: [
            {
              statement_name: "set1_statement1",
            },
            {
              statement_name: "set1_statement2",
            }
          ]
        },
        {
          supplemental_data_elements: [
            {
              statement_name: "set2_statement1",
            },
            {
              statement_name: "set2_statement2",
            }
          ]
        },
        {
          supplemental_data_elements: []
        },
        {}
      ];
    });

    it("statement found1 -> true", () => {
      const statementName = "set1_statement1";
      expect(MeasureHelpers.isSupplementalDataElementStatement(this.populationSets, statementName)).toBeTruthy();
    });

    it("statement found2 -> true", () => {
      const statementName = "set1_statement2";
      expect(MeasureHelpers.isSupplementalDataElementStatement(this.populationSets, statementName)).toBeTruthy();
    });

    it("statement found3 -> true", () => {
      const statementName = "set2_statement2";
      expect(MeasureHelpers.isSupplementalDataElementStatement(this.populationSets, statementName)).toBeTruthy();
    });

    it("statement not found -> false", () => {
      const statementName = "not_found";
      expect(MeasureHelpers.isSupplementalDataElementStatement(this.populationSets, statementName)).toBeFalsy();
    });
  });

  describe("others", () => {
    it("run findAllLocalIdsInSort", () => {
      const statement = { localId: "statementLocalId" };
      const libraryName = "statement1";
      const localIds = { notModified: "notModified" };
      const aliasMap = {}
      const emptyResultClauses = []
      const rootStatement = { localId: "rootStatementLocalId" }
      const result = MeasureHelpers.findAllLocalIdsInSort(statement, libraryName, localIds, aliasMap, emptyResultClauses, rootStatement);
      expect(result).toBeDefined();
      expect(localIds).toEqual({ notModified: "notModified" });
      expect(emptyResultClauses).toEqual([{"aliasLocalId": "statementLocalId", "expressionLocalId": "rootStatementLocalId", "lib": "statement1"}]);
    });
  });
});
