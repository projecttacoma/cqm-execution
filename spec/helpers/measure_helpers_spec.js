const MeasureHelpers = require('../../lib/helpers/measure_helpers');
const getJSONFixture = require('../support/spec_helper.js').getJSONFixture;

describe('MeasureHelpers', () => {
  describe('findAllLocalIdsInStatementByName', () => {
    it('finds localIds for library FunctionRefs while finding localIds in statements', () => {
      // Loads Anticoagulation Therapy for Atrial Fibrillation/Flutter measure.
      // This measure has the MAT global functions library included and the measure uses the
      // "CalendarAgeInYearsAt" function.
      const measure = getJSONFixture('cqm_measures/CMS723v0/CMS723v0.json');

      // Find the localid for the specific statement with the global function ref.
      const library = measure.cql_libraries.find(lib => lib.library_name === 'AnticoagulationTherapyforAtrialFibrillationFlutter');
      const statementName = 'Encounter with Principal Diagnosis and Age';
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(library.elm, statementName);

      // For the fixture loaded for this test it is known that the library reference is 49 and the functionRef itself is 55.
      expect(localIds[49]).not.toBeUndefined();
      expect(localIds[49]).toEqual({ localId: '49', sourceLocalId: '55' });
    });

    it('finds localIds for library ExpressionRefs while finding localIds in statements', () => {
      // Loads Test104 aka. CMS13 measure.
      // This measure has both the TJC_Overall and MAT global libraries
      const measure = getJSONFixture('cqm_measures/CMS13v2/CMS13v2.json');

      // Find the localid for the specific statement with the global function ref.
      const library = measure.cql_libraries.find(lib => lib.library_name === 'Test104');
      const statementName = 'Initial Population';
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(library.elm, statementName);

      // For the fixture loaded for this test it is known that the library reference is 109 and the functionRef itself is 110.
      expect(localIds[109]).not.toBeUndefined();
      expect(localIds[109]).toEqual({ localId: '109', sourceLocalId: '110' });
    });

    it('handles library ExpressionRefs with libraryRef embedded in the clause', () => {
      // Loads Test104 aka. CMS13 measure.
      // This measure has both the TJC_Overall and MAT global libraries
      const measure = getJSONFixture('cqm_measures/CMS13v2/CMS13v2.json');

      // Find the localid for the specific statement with the global function ref.
      const library = measure.cql_libraries.find(lib => lib.library_name === 'Test104');
      const statementName = 'Comfort Measures during Hospitalization';
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(library.elm, statementName);

      // For the fixture loaded for this test it is known that the library reference is 109 and the functionRef itself is 110.
      expect(localIds[42]).not.toBeUndefined();
      expect(localIds[42]).toEqual({ localId: '42' });
    });
  });


  describe('findLocalIdForLibraryRef for functionRefs', () => {
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const measure = getJSONFixture('cqm_measures/CMS723v0/CMS723v0.json');

      // The annotation for the 'Encounter with Principal Diagnosis and Age' will be used for these tests
      // it is known the functionRef 'global.CalendarAgeInYearsAt' is a '55' and the libraryRef clause is at '49'
      this.annotationSnippet = measure.cql_libraries[0].elm.library.statements.def[6].annotation;
    });

    it('returns correct localId for functionRef if when found', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '55', 'global');
      expect(ret).toEqual('49');
    });

    it('returns null if it does not find the localId for the functionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '23', 'global');
      expect(ret).toBeNull();
    });

    it('returns null if it does not find the proper libraryName for the functionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '55', 'notGlobal');
      expect(ret).toBeNull();
    });

    it('returns null if annotation is empty', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef({}, '55', 'notGlobal');
      expect(ret).toBeNull();
    });

    it('returns null if there is no value associated with annotation', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '68', 'notGlobal');
      expect(ret).toBeNull();
    });
  });

  describe('findLocalIdForLibraryRef for expressionRefs', () => {
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const measure = getJSONFixture('cqm_measures/CMS13v2/CMS13v2.json');

      // The annotation for the 'Initial Population' will be used for these tests
      // it is known the expressionRef 'TJC."Encounter with Principal Diagnosis and Age"' is '110' and the libraryRef
      // clause is at '109'
      this.annotationSnippet = measure.cql_libraries[0].elm.library.statements.def[12].annotation;
    });

    it('returns correct localId for expressionRef when found', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '110', 'TJC');
      expect(ret).toEqual('109');
    });

    it('returns null if it does not find the localId for the expressionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '21', 'TJC');
      expect(ret).toBeNull();
    });

    it('returns null if it does not find the proper libraryName for the expressionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '110', 'notTJC');
      expect(ret).toBeNull();
    });
  });

  describe('findLocalIdForLibraryRef for expressionRefs with libraryRef in clause', () => {
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const measure = getJSONFixture('cqm_measures/CMS13v2/CMS13v2.json');

      // The annotation for the 'Comfort Measures during Hospitalization' will be used for these tests
      // it is known the expressionRef 'TJC."Encounter with Principal Diagnosis of Ischemic Stroke"' is '42' and the
      // libraryRef is embedded in the clause without a localId of its own.
      this.annotationSnippet = measure.cql_libraries[0].elm.library.statements.def[8].annotation;
    });

    it('returns null for expressionRef when found yet it is embedded', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '42', 'TJC');
      expect(ret).toBeNull();
    });

    it('returns null if it does not find the proper libraryName for the expressionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(this.annotationSnippet, '42', 'notTJC');
      expect(ret).toBeNull();
    });
  });
});
