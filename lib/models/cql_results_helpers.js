/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const _ = require('lodash');
const cql = require('cql-execution');
const { Measure } = require('cqm-models');

/**
 * Contains helpers that generate useful data for coverage and highlighing. These structures are added to the Result
 * object in the CQLCalculator.
 */
module.exports = class CQLResultsHelpers {
  /**
   * Builds the `statement_relevance` map. This map gets added to the Result attributes that the calculator returns.
   *
   * The statement_relevance map indicates which define statements were actually relevant to a population inclusion
   * consideration. This makes use of the 'population_relevance' map. This is actually a two level map. The top level is
   * a map of the CQL libraries, keyed by library name. The second level is a map for statement relevance in that library,
   * which maps each statement to its relevance status. The values in this map differ from the `population_relevance`
   * because we also need to track statements that are not used for any population calculation. Therefore the values are
   * a string that is one of the following: 'NA', 'TRUE', 'FALSE'. Here is what they mean:
   *
   * 'NA' - Not applicable. This statement is not relevant to any population calculation in this population_set. Common
   *   for unused library statements or statements only used for other population sets.
   *
   * 'FALSE' - This statement is not relevant to any of this patient's population inclusion calculations.
   *
   * 'TRUE' - This statement is relevant for one or more of the population inclusion calculations.
   *
   * Here is an example structure this function returns. (the `statement_relevance` map)
   * {
   *   "Test158": {
   *     "Patient": "NA",
   *     "SDE Ethnicity": "NA",
   *     "SDE Payer": "NA",
   *     "SDE Race": "NA",
   *     "SDE Sex": "NA",
   *     "Most Recent Delivery": "TRUE",
   *     "Most Recent Delivery Overlaps Diagnosis": "TRUE",
   *     "Initial Population": "TRUE",
   *     "Numerator": "TRUE",
   *     "Denominator Exceptions": "FALSE"
   *   },
   *   "TestLibrary": {
   *     "Numer Helper": "TRUE",
   *     "Denom Excp Helper": "FALSE",
   *     "Unused statement": "NA"
   *   }
   * }
   *
   * This function relies heavily on the cqlStatementDependencies map on the Measure to recursively determine which
   * statements are used in the relevant population statements. It also uses the 'population_relevance' map to determine
   * the relevance of the population defining statement and its dependent statements.
   * @public
   * @param {object} populationRelevance - The `population_relevance` map, used at the starting point.
   * @param {Measure} measure - The measure.
   * @param {population} populationSet - The population set being calculated.
   * @returns {object} The `statement_relevance` map that maps each statement to its relevance status for a calculation.
   *   This structure is put in the Result object's attributes.
   */
  static buildStatementRelevanceMap(populationRelevance, measure, populationSet) {
    // build map defaulting to not applicable (NA) using cqlStatementDependencies structure
    const statementRelevance = {};
    const object = measure.get('cql_statement_dependencies');

    Object.keys(object).forEach((lib) => {
      const statements = object[lib];
      statementRelevance[lib] = {};
      Object.keys(statements).forEach((statementName) => {
        statementRelevance[lib][statementName] = 'NA';
      });
    });

    Object.keys(populationRelevance).forEach((population) => {
      // If the population is values, that means we need to mark relevance for the OBSERVs
      const relevance = populationRelevance[population];
      if (population === 'values') {
        measure.get('observations').forEach((observation) => {
          this.markStatementRelevant(
            measure.get('cql_statement_dependencies'), statementRelevance,
            measure.get('main_cql_library'), observation.function_name, relevance,
          );
        });
      } else {
        const populationIndex = populationSet.getPopIndexFromPopName(population);
        const relevantStatement = measure.get('populations_cql_map')[population][populationIndex];
        this.markStatementRelevant(
          measure.get('cql_statement_dependencies'), statementRelevance,
          measure.get('main_cql_library'), relevantStatement, relevance,
        );
      }
    });

    return statementRelevance;
  }

  /**
   * Recursive helper function for the _buildStatementRelevanceMap function. This marks a statement as relevant (or not
   * relevant but applicable) in the `statement_relevance` map. It recurses and marks dependent statements also relevant
   * unless they have already been marked as 'TRUE' for their relevance statue. This function will never be called on
   * statements that are 'NA'.
   * @private
   * @param {object} cqlStatementDependencies - Dependency map from the measure object. The thing we recurse over
   *   even though it is flat, it represents a tree.
   * @param {object} statementRelevance - The `statement_relevance` map to mark.
   * @param {string} libraryName - The library name of the statement we are marking.
   * @param {string} statementName - The name of the statement we are marking.
   * @param {boolean} relevant - true if the statement should be marked 'TRUE', false if it should be marked 'FALSE'.
   */
  static markStatementRelevant(
    cqlStatementDependencies, statementRelevanceParam,
    libraryName, statementName, relevant,
  ) {
    const statementRelevance = statementRelevanceParam;
    // only mark the statement if it is currently 'NA' or 'FALSE'. Otherwise it already has been marked 'TRUE'
    if ((statementRelevance[libraryName][statementName] === 'NA') ||
        (statementRelevance[libraryName][statementName] === 'FALSE')) {
      statementRelevance[libraryName][statementName] = relevant ? 'TRUE' : 'FALSE';
      return Array.from(cqlStatementDependencies[libraryName][statementName])
        .map(dependentStatement =>
          this.markStatementRelevant(
            cqlStatementDependencies, statementRelevance,
            dependentStatement.library_name, dependentStatement.statement_name, relevant,
          ));
    }
    return Array.from(cqlStatementDependencies[libraryName][statementName]);
  }

  /**
   * Builds the result structures for the statements and the clauses. These are named `statement_results` and
   * `clause_results` respectively when added Result object's attributes.
   *
   * The `statement_results` structure indicates the result for each statement taking into account the statement
   * relevance in determining the result. This is a two level map just like `statement_relevance`. The first level key is
   * the library name and the second key level is the statement name. The value is an object that has two properties,
   * 'raw' and 'final'. 'raw' is the raw result from the execution engine for that statement. 'final' is the final result
   * that takes into account the relevance in this calculation. The value of 'final' will be one of the following
   * strings: 'NA', 'UNHIT', 'TRUE', 'FALSE'. Here's what they mean:
   *
   * 'NA' - Not applicable. This statement is not relevant to any population calculation in this population_set. Common
   *   for unused library statements or statements only used for other population sets.
   *   !!!IMPORTANT NOTE!!! All define function statements are marked 'NA' since we don't have a strategy for
   *        highlighting or coverage when it comes to functions.
   *
   * 'UNHIT' - This statement wasn't hit. This is most likely because the statement was not relevant to population
   *     calculation for this patient. i.e. 'FALSE' in the the `statement_relevance` map.
   *
   * 'TRUE' - This statement is relevant and has a truthy result.
   *
   * 'FALSE' - This statement is relevant and has a falsey result.
   *
   * Here is an example of the `statement_results` structure: (raw results have been turned into "???" for this example)
   * {
   *   "Test158": {
   *     "Patient": { "raw": "???", "final": "NA" },
   *     "SDE Ethnicity": { "raw": "???", "final": "NA" },
   *     "SDE Payer": { "raw": "???", "final": "NA" },
   *     "SDE Race": { "raw": "???", "final": "NA" },
   *     "SDE Sex": { "raw": "???", "final": "NA" },
   *     "Most Recent Delivery": { "raw": "???", "final": "TRUE" },
   *     "Most Recent Delivery Overlaps Diagnosis": { "raw": "???", "final": "TRUE" },
   *     "Initial Population": { "raw": "???", "final": "TRUE" },
   *     "Numerator": { "raw": "???", "final": "TRUE" },
   *     "Denominator Exceptions": { "raw": "???", "final": "UNHIT" }
   *   },
   *  "TestLibrary": {
   *     "Numer Helper": { "raw": "???", "final": "TRUE" },
   *     "Denom Excp Helper": { "raw": "???", "final": "UNHIT" },
   *     "Unused statement": { "raw": "???", "final": "NA" }
   *   }
   * }
   *
   *
   * The `clause_results` structure is the same as the `statement_results` but it indicates the result for each clause.
   * The second level key is the localId for the clause. The result object is the same with the same  'raw' and 'final'
   * properties but it also includes the name of the statement it resides in as 'statementName'.
   *
   * This function relies very heavily on the `statement_relevance` map to determine the final results. This function
   * returns the two structures together in an object ready to be added directly to the Result attributes.
   * @public
   * @param {Measure} measure - The measure.
   * @param {object} rawClauseResults - The raw clause results from the calculation engine.
   * @param {object} statementRelevance - The `statement_relevance` map. Used to determine if they were hit or not.
   * @returns {object} Object with the statement_results and clause_results structures, keyed as such.
   */
  static buildStatementAndClauseResults(measure, rawClauseResults, statementRelevance) {
    const statementResults = {};
    const clauseResults = {};
    const object = measure.get('cql_statement_dependencies');

    Object.keys(object).forEach((lib) => {
      const statements = object[lib];
      statementResults[lib] = {};
      clauseResults[lib] = {};
      Object.keys(statements).forEach((statementName) => {
        const rawStatementResult =
          this.findResultForStatementClause(measure, lib, statementName, rawClauseResults);
        statementResults[lib][statementName] = { raw: rawStatementResult };
        if ((_.indexOf(Measure.cqlSkipStatements, statementName) >= 0) ||
            (statementRelevance[lib][statementName] === 'NA')) {
          statementResults[lib][statementName].final = 'NA';
        } else if ((statementRelevance[lib][statementName] === 'FALSE') ||
                   (rawClauseResults[lib] == null)) {
          statementResults[lib][statementName].final = 'UNHIT';
        } else {
          statementResults[lib][statementName].final =
            this.doesResultPass(rawStatementResult) ? 'TRUE' : 'FALSE';
        }

        // create clause results for all localIds in this statement
        const localIds = measure.findAllLocalIdsInStatementByName(lib, statementName);
        Object.keys(localIds).forEach((localId) => {
          const clause = localIds[localId];
          const clauseResult = {
            // if this clause is an alias or a usage of alias it will get the raw result from the sourceLocalId.
            raw: (rawClauseResults[lib] != null ?
              rawClauseResults[lib][(clause.sourceLocalId != null) ?
                clause.sourceLocalId :
                localId] :
              undefined),
            statementName,
          };

          clauseResult.final = this.setFinalResults({
            statementRelevance,
            statementName,
            rawClauseResults,
            lib,
            localId,
            clause,
            rawResult: clauseResult.raw,
          });

          clauseResults[lib][localId] = clauseResult;
        });
      });
    });

    return { statement_results: statementResults, clause_results: clauseResults };
  }


  /**
   * Determines the final result (for coloring and coverage) for a clause. The result fills the 'final' property for the
   * clause result. Look at the comments for _buildStatementAndClauseResults to get a description of what each of the
   * string results of this function are.
   * @private
   * @param {object} rawClauseResults - The raw clause results from the calculation engine.
   * @param {object} statementRelevance - The statement relevance map.
   * @param {object} statementName - The name of the statement the clause is in
   * @param {object} lib - The name of the libarary the clause is in
   * @param {object} localId - The localId of the current clause
   * @param {object} clause - The clause we are getting the final result of
   * @param {Array|Object|Interval|??} rawResult - The raw result from the calculation engine.
   * @returns {string} The final result for the clause.
   */
  static setFinalResults(params) {
    let finalResult = 'FALSE';
    if ((_.indexOf(Measure.cqlSkipStatements, params.statementName) >= 0) ||
        (params.clause.isUnsupported != null)) {
      finalResult = 'NA';
    } else if (params.statementRelevance[params.lib][params.statementName] === 'NA') {
      finalResult = 'NA';
    } else if ((params.statementRelevance[params.lib][params.statementName] === 'FALSE') ||
               (params.rawClauseResults[params.lib] == null)) {
      finalResult = 'UNHIT';
    } else if (this.doesResultPass(params.rawResult)) {
      finalResult = 'TRUE';
    }
    return finalResult;
  }

  /**
   * Finds the clause localId for a statement and gets the raw result for it from the raw clause results.
   * @private
   * @param {Measure} measure - The measure.
   * @param {string} libraryName - The library name.
   * @param {string} statementName - The statement name.
   * @param {object} rawClauseResults - The raw clause results from the engine.
   * @returns {(Array|object|Interval|??)} The raw result from the calculation engine for the given statement.
   */
  static findResultForStatementClause(measure, libraryName, statementName, rawClauseResults) {
    let library = null;
    let statement = null;
    measure.get('elm').forEach((lib) => {
      if (lib.library.identifier.id === libraryName) {
        library = lib;
      }
    });

    library.library.statements.def.forEach((curStatement) => {
      if (curStatement.name === statementName) {
        statement = curStatement;
      }
    });

    return (rawClauseResults[libraryName] != null ?
      rawClauseResults[libraryName][statement.localId] : undefined);
  }

  /**
   * Determines if a result (for a statement or clause) from the execution engine is a pass or fail.
   * @private
   * @param {(Array|object|boolean|???)} result - The result from the calculation engine.
   * @returns {boolean} true or false
   */
  static doesResultPass(result) {
    if (result === true) { // Specifically a boolean true
      return true;
    } else if (result === false) { // Specifically a boolean false
      return false;
    } else if (Array.isArray(result)) { // Check if result is an array
      if (result.length === 0) { // Result is true if the array is not empty
        return false;
      } else if ((result.length === 1) && (result[0] === null)) { // But if the array has one element that is null. Then we should make it red.
        return false;
      }
      return true;
    } else if (result instanceof cql.Interval) { // make it green if and Interval is returned
      return true;
    // Return false if an empty cql.Code is the result
    } else if (result instanceof cql.Code && (result.code == null)) {
      return false;
    } else if ((result === null) || (result === undefined)) { // Specifically no result
      return false;
    }
    return true;
  }
};
