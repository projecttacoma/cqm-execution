const _ = require('lodash');
const CqmModels = require('cqm-models');

const cql = CqmModels.CQL;

const MeasureHelpers = require('../helpers/measure_helpers');
const moment = require('moment');

/**
 * Contains helpers that generate useful data for coverage and highlighing. These structures are added to the Result
 * object in the CQLCalculator.
 */
module.exports = class ResultsHelpers {
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
   * This function relies heavily on the cql_statement_dependencies map on the Measure to recursively determine which
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
    // build map defaulting to not applicable (NA) using cql_statement_dependencies structure
    const statementRelevance = {};
    for (const lib of measure.cql_libraries) {
      statementRelevance[lib.library_name] = {};
      for (const statement of lib.statement_dependencies) {
        statementRelevance[lib.library_name][statement.statement_name] = 'NA';
      }
    }

    if (measure.calculate_sdes && populationSet.supplemental_data_elements) {
      for (const statement of Array.from(populationSet.supplemental_data_elements)) {
        // Mark all Supplemental Data Elements as relevant
        this.markStatementRelevant(
          measure.cql_libraries,
          statementRelevance,
          measure.main_cql_library,
          statement.statement_name,
          'TRUE'
        );
      }
    }

    for (const population in populationRelevance) {
      // If the population is values, that means we need to mark relevance for the OBSERVs
      const relevance = populationRelevance[population];
      if (population === 'observation_values') {
        for (const observation of Array.from(populationSet.observations)) {
          this.markStatementRelevant(
            measure.cql_libraries,
            statementRelevance,
            measure.main_cql_library,
            observation.observation_function.statement_name,
            relevance
          );
        }
      } else {
        const relevantStatement = populationSet.populations[population].statement_name;
        this.markStatementRelevant(
          measure.cql_libraries,
          statementRelevance,
          measure.main_cql_library,
          relevantStatement,
          relevance
        );
      }
    }

    return statementRelevance;
  }


  /**
   * Recursive helper function for the _buildStatementRelevanceMap function. This marks a statement as relevant (or not
   * relevant but applicable) in the `statement_relevance` map. It recurses and marks dependent statements also relevant
   * unless they have already been marked as 'TRUE' for their relevance statue. This function will never be called on
   * statements that are 'NA'.
   * @private
   * @param {Array<CQLLibraries>} cqlLibraries - Dependency map from the measure object. The thing we recurse over
   *   even though it is flat, it represents a tree.
   * @param {object} statementRelevance - The `statement_relevance` map to mark.
   * @param {string} libraryName - The library name of the statement we are marking.
   * @param {string} statementName - The name of the statement we are marking.
   * @param {boolean} relevant - true if the statement should be marked 'TRUE', false if it should be marked 'FALSE'.
   */
  static markStatementRelevant(cqlLibraries, statementRelevance, libraryName, statementName, relevant) {
    // only mark the statement if it is currently 'NA' or 'FALSE'. Otherwise it already has been marked 'TRUE'
    if (
      statementRelevance[libraryName][statementName] === 'NA' ||
      statementRelevance[libraryName][statementName] === 'FALSE'
    ) {
      statementRelevance[libraryName][statementName] = relevant ? 'TRUE' : 'FALSE';
      const library = cqlLibraries.find(lib => lib.library_name === libraryName);
      const statement = library.statement_dependencies.find(stat => stat.statement_name === statementName);
      if (!statement || !statement.statement_references) {
        return [];
      }
      return statement.statement_references.map(dependentStatement =>
        this.markStatementRelevant(
          cqlLibraries,
          statementRelevance,
          dependentStatement.library_name,
          dependentStatement.statement_name,
          relevant
        ));
    }
    return [];
  }

  /**
     * Builds the result structures for the statements and the clauses. These are named `statement_results` and
     * `clause_results` respectively when added Result object's attributes.
     *
     * The `statement_results` structure indicates the result for each statement taking into account the statement
     * relevance in determining the result. This is a two level map just like `statement_relevance`. The first level key is
     * the library name and the second key level is the statement name. The value is an object that has three properties,
     * 'raw', 'final' and 'pretty'. 'raw' is the raw result from the execution engine for that statement. 'final' is the final
     * result that takes into account the relevance in this calculation. 'pretty' is a human readable description of the result
     * that is only generated if doPretty is true.
     * The value of 'final' will be one of the following strings:
     * 'NA', 'UNHIT', 'TRUE', 'FALSE'.
     *
     * Here's what they mean:
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
     *     "Patient": { "raw": "???", "final": "NA", "pretty": "NA" },
     *     "SDE Ethnicity": { "raw": "???", "final": "NA", "pretty": "NA" },
     *     "SDE Payer": { "raw": "???", "final": "NA", "pretty": "NA" },
     *     "SDE Race": { "raw": "???", "final": "NA", "pretty": "NA" },
     *     "SDE Sex": { "raw": "???", "final": "NA", "pretty": "NA" },
     *     "Most Recent Delivery": { "raw": "???", "final": "TRUE", "pretty": "???" },
     *     "Most Recent Delivery Overlaps Diagnosis": { "raw": "???", "final": "TRUE", "pretty": "???" },
     *     "Initial Population": { "raw": "???", "final": "TRUE", "pretty": "???" },
     *     "Numerator": { "raw": "???", "final": "TRUE", "pretty": "???" },
     *     "Denominator Exceptions": { "raw": "???", "final": "UNHIT", "pretty": "UNHIT" },
     *   },
     *  "TestLibrary": {
     *     "Numer Helper": { "raw": "???", "final": "TRUE", "pretty": "???" },
     *     "Denom Excp Helper": { "raw": "???", "final": "UNHIT", "pretty": "UNHIT" },
     *     "Unused statement": { "raw": "???", "final": "NA", "pretty": "???" },
     *     "false statement": { "raw": "???", "final": "FALSE", "pretty": "FALSE: []" },
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
     * @param {boolean} doPretty - If true, also generate pretty versions of result.
     * @param {boolean} requestDocument - If true, returns result as IndividualResult Mongoose Document
     * @returns {object} Object with the statement_results and clause_results structures, keyed as such.
     */
  static buildStatementAndClauseResults(measure, rawClauseResults, statementRelevance, doPretty, includeClauseResults, requestDocument) {
    if (doPretty == null) {
      doPretty = false;
    }

    let statementResults = {};
    let clauseResults = {};

    if (requestDocument) {
      statementResults = [];
      clauseResults = [];
    }
    for (const library of measure.cql_libraries) {
      const statements = library.statement_dependencies;
      const library_name = library.library_name; // eslint-disable-line camelcase
      if (!requestDocument) {
        statementResults[library.library_name] = {};
        clauseResults[library.library_name] = {};
      }
      for (const statement of statements) {
        const statement_name = statement.statement_name; // eslint-disable-line camelcase
        const relevance = statementRelevance[library_name][statement_name];
        let rawStatementResult = this.findResultForStatementClause(library, statement, rawClauseResults);
        if (rawStatementResult && rawStatementResult.isMongooseArray) {
          rawStatementResult = [].concat(rawStatementResult);
        }
        const statementResult = {
          raw: rawStatementResult, library_name, statement_name, relevance,
        };
        const isSDE = MeasureHelpers.isSupplementalDataElementStatement(measure.population_sets, statement_name);
        if ((!measure.calculate_sdes && isSDE) || relevance === 'NA') {
          statementResult.final = 'NA';
          if (doPretty) {
            statementResult.pretty = 'NA';
          }
        } else if (relevance === 'FALSE' || rawClauseResults[library_name] == null) {
          statementResult.final = 'UNHIT';
          // even if the statement wasn't hit, we want the pretty result to just
          // be FUNCTION for functions
          if (doPretty) {
            if (MeasureHelpers.isStatementFunction(library, statement_name)) {
              statementResult.pretty = 'FUNCTION';
            } else {
              statementResult.pretty = 'UNHIT';
            }
          }
        } else if (this.doesResultPass(rawStatementResult)) {
          statementResult.final = 'TRUE';
          if (doPretty) {
            statementResult.pretty = this.prettyResult(rawStatementResult);
          }
        } else {
          statementResult.final = 'FALSE';
          if (rawStatementResult instanceof Array && rawStatementResult.length === 0) {
            // Special case, handle empty array.
            if (doPretty) {
              statementResult.pretty = 'FALSE ([])';
            }
          } else if (MeasureHelpers.isStatementFunction(library, statement_name)) {
            if (doPretty) {
              statementResult.pretty = 'FUNCTION';
            }
          } else if (doPretty) {
            statementResult.pretty = `FALSE (${rawStatementResult})`;
          }
        }

        if (requestDocument) {
          const statementResultDocument = new CqmModels.StatementResult(statementResult);
          statementResults.push(statementResultDocument);
        } else {
          statementResults[library_name][statement_name] = statementResult;
        }

        if (includeClauseResults) {
          // create clause results for all localIds in this statement
          const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(library.elm, statement_name);
          for (const localId in localIds) {
            const clause = localIds[localId];
            let rawClauseResult = rawClauseResults[library_name] != null
              ? rawClauseResults[library_name][clause.sourceLocalId != null ? clause.sourceLocalId : localId]
              : undefined;
            if (rawClauseResult && rawClauseResult.isMongooseArray) {
              rawClauseResult = [].concat(rawClauseResult);
            }
            const clauseResult = {
              // if this clause is an alias or a usage of alias it will get the raw result from the sourceLocalId.
              raw: rawClauseResult,
              statement_name,
              library_name,
              localId,
            };

            clauseResult.final = this.setFinalResults({
              statementRelevance,
              statement_name,
              rawClauseResults,
              library_name,
              localId,
              clause,
              rawResult: clauseResult.raw,
            });
            if (requestDocument) {
              const clauseResultDocument = new CqmModels.ClauseResult(clauseResult);
              clauseResults.push(clauseResultDocument);
            } else {
              clauseResults[library_name][localId] = clauseResult;
            }
          }
        }
      }
    }
    const response = { statement_results: statementResults };
    response.clause_results = includeClauseResults ? clauseResults : null;
    return response;
  }

  /**
     * Generates a pretty human readable representation of a result.
     *
     * @param {(Array|object|boolean|???)} result - The result from the calculation engine.
     * @param {Integer} indentLevel - For nested objects, the indentLevel indicates how far to indent.
     *                                Note that 1 is the base because Array(1).join ' ' returns ''.
     * @returns {String} a pretty version of the given result
     */
  static prettyResult(result, indentLevel, keyIndent) {
    const nameOidHash = {
      '2.16.840.1.113883.6.96': 'SNOMEDCT',
      '2.16.840.1.113883.6.1': 'LOINC',
      '2.16.840.1.113883.6.238': 'CDCREC',
      '2.16.840.1.113883.6.14': 'HCP',
      '2.16.840.1.113883.6.285': 'HCPCS',
      '2.16.840.1.113883.6.103': 'ICD-9-CM',
      '2.16.840.1.113883.6.104': 'ICD-9-PCS',
      '2.16.840.1.113883.6.90': 'ICD-10-CM',
      '2.16.840.1.113883.6.4': 'ICD-10-PCS',
      '2.16.840.1.113883.6.88': 'RxNorm',
      '2.16.840.1.113883.3.221.5': 'Source of Payment Typology',
      '2.16.840.1.113883.6.12': 'CPT',
      '2.16.840.1.113883.5.1': 'AdministrativeGender',
      '2.16.840.1.113883.4.642.3.921': 'HL7 Relationship Code',
      '2.16.840.1.113883.5.2': 'HL7 Marital Status',
      '2.16.840.1.113883.12.292': 'CVX',
      '2.16.840.1.113883.5.83': 'HITSP C80 Observation Status',
      '2.16.840.1.113883.3.26.1.1': 'NCI Thesaurus',
      '2.16.840.1.113883.3.88.12.80.20': 'FDA',
      '2.16.840.1.113883.4.9': 'UNII',
      '2.16.840.1.113883.6.69': 'NDC',
      '2.16.840.1.113883.5.14': 'HL7 ActStatus',
      '2.16.840.1.113883.6.259': 'HL7 Healthcare Service Location',
      '2.16.840.1.113883.12.112': 'DischargeDisposition',
      '2.16.840.1.113883.5.4': 'HL7 Act Code',
      '2.16.840.1.113883.6.177': 'NLM MeSH',
      '2.16.840.1.113883.5.1076': 'Religious Affiliation',
      '2.16.840.1.113883.1.11.19717': 'HL7 ActNoImmunicationReason',
      '2.16.840.1.113883.3.88.12.80.33': 'NUBC',
      '2.16.840.1.113883.1.11.78': 'HL7 Observation Interpretation',
      '2.16.840.1.113883.6.13': 'CDT',
      '2.16.840.1.113883.18.2': 'AdministrativeSex',
    };
    let prettyResult;
    if (indentLevel == null) {
      indentLevel = 1;
    }
    if (keyIndent == null) {
      keyIndent = 1;
    }
    const keyIndentation = Array(keyIndent).join(' ');
    const currentIndentation = Array(indentLevel).join(' ');
    if (result instanceof cql.DateTime) {
      return moment.utc(result.toString()).format('MM/DD/YYYY h:mm A');
    } else if (result instanceof cql.Interval) {
      return `INTERVAL: ${this.prettyResult(result.low)} - ${this.prettyResult(result.high)}`;
    } else if (result instanceof cql.Code) {
      return `CODE: ${nameOidHash[result.system] || result.system} ${result.code}`;
    } else if (result instanceof cql.Quantity) {
      let quantityResult = `QUANTITY: ${result.value}`;
      if (result.unit) {
        quantityResult += ` ${result.unit}`;
      }
      return quantityResult;
    } else if (result && typeof result._type === 'string' && result._type.includes('QDM::')) {
      // If there isn't a description, use the type name as a fallback.  This mirrors the frontend where we do
      // result.constructor.name.
      const description = result.description ? `${result.description}\n` : `${result._type.replace('QDM::', '')}\n`;
      let startDateTime = null;
      let endDateTime = null;
      let startTimeString = '';
      let endTimeString = '';
      // Start time of data element is start of relevant period, if data element does not have relevant period, use authorDatetime
      if (result.relevantPeriod) {
        if (result.relevantPeriod.low) {
          startDateTime = result.relevantPeriod.low;
        }
        if (result.relevantPeriod.high) {
          endDateTime = result.relevantPeriod.high;
        }
      } else if (result.prevalencePeriod) {
        if (result.prevalencePeriod.low) {
          startDateTime = result.prevalencePeriod.low;
        }
        if (result.prevalencePeriod.high) {
          endDateTime = result.prevalencePeriod.high;
        }
      } else if (result.authorDatetime) {
        // TODO: start result string will need to be updated to AUTHORED once bonnie frontend
        // updates its pretty printer to do so.
        startDateTime = result.authorDatetime;
      }

      if (startDateTime) {
        startTimeString = `START: ${moment.utc(startDateTime.toString()).format('MM/DD/YYYY h:mm A')}\n`;
      }
      // If endTime is the infinity dateTime, clear it out because we do not want to export it
      if (endDateTime && endDateTime.year !== 9999) {
        endTimeString = `STOP: ${moment.utc(endDateTime.toString()).format('MM/DD/YYYY h:mm A')}\n`;
      }
      const system = result.dataElementCodes[0].system;
      const codeDisplay = result.dataElementCodes && result.dataElementCodes[0] ? `CODE: ${nameOidHash[system] || system} ${result.dataElementCodes[0].code}` : '';
      // Add indentation
      const returnString = `${description}${startTimeString}${endTimeString}${codeDisplay}`;
      return returnString.replace(/\n/g, `\n${currentIndentation}${keyIndentation}`);
    } else if (result instanceof String || typeof result === 'string') {
      return `"${result}"`;
    } else if (result instanceof Array) {
      prettyResult = _.map(result, value => this.prettyResult(value, indentLevel, keyIndent));
      return `[${prettyResult.join(`,\n${currentIndentation}${keyIndentation}`)}]`;
    } else if (result instanceof Object) {
      // if the object has it's own custom toString method, use that instead
      if (typeof result.toString === 'function' && result.toString !== Object.prototype.toString) {
        return result.toString();
      }
      prettyResult = '{\n';
      const baseIndentation = Array(3).join(' ');
      const sortedKeys = Object.keys(result).sort().filter(key => key !== '_type' && key !== 'qdmVersion');
      for (const key of sortedKeys) {
        // add 2 spaces per indent
        const value = result[key];
        const nextIndentLevel = indentLevel + 2;
        // key length + ': '
        keyIndent = key.length + 3;
        prettyResult = prettyResult.concat(`${baseIndentation}${currentIndentation}${key}: ${this.prettyResult(value, nextIndentLevel, keyIndent)}`);
        // append commas if it isn't the last key
        if (key === sortedKeys[sortedKeys.length - 1]) {
          prettyResult += '\n';
        } else {
          prettyResult += ',\n';
        }
      }
      prettyResult += `${currentIndentation}}`;
      return prettyResult;
    }
    if (result) {
      return JSON.stringify(result, null, 2);
    }
    return 'null';
  }

  /**
     * Determines the final result (for coloring and coverage) for a clause. The result fills the 'final' property for the
     * clause result. Look at the comments for buildStatementAndClauseResults to get a description of what each of the
     * string results of this function are.
     * @private
     * @param {object} rawClauseResults - The raw clause results from the calculation engine.
     * @param {object} statementRelevance - The statement relevance map.
     * @param {object} statement_name - The name of the statement the clause is in
     * @param {object} library_name - The name of the libarary the clause is in
     * @param {object} localId - The localId of the current clause
     * @param {object} clause - The clause we are getting the final result of
     * @param {Array|Object|Interval|??} rawResult - The raw result from the calculation engine.
     * @returns {string} The final result for the clause.
     */
  static setFinalResults(params) {
    let finalResult = 'FALSE';
    if (params.clause.isUnsupported != null) {
      finalResult = 'NA';
    } else if (params.statementRelevance[params.library_name][params.statement_name] === 'NA') {
      finalResult = 'NA';
    } else if (
      params.statementRelevance[params.library_name][params.statement_name] === 'FALSE' ||
      params.rawClauseResults[params.library_name] == null
    ) {
      finalResult = 'UNHIT';
    } else if (this.doesResultPass(params.rawResult)) {
      finalResult = 'TRUE';
    }
    return finalResult;
  }

  /**
   * Finds the clause localId for a statement and gets the raw result for it from the raw clause results.
   * @private
   * @param {string} library - The library
   * @param {string} statement - The statement
   * @param {object} rawClauseResults - The raw clause results from the engine.
   * @returns {(Array|object|Interval|??)} The raw result from the calculation engine for the given statement.
   */
  static findResultForStatementClause(library, statement, rawClauseResults) {
    const elmStatement = library.elm.library.statements.def.find(def => def.name === statement.statement_name);
    const libraryName = library.library_name;
    return rawClauseResults[libraryName] != null ? rawClauseResults[libraryName][elmStatement.localId] : undefined;
  }

  /**
   * Determines if a result (for a statement or clause) from the execution engine is a pass or fail.
   * @private
   * @param {(Array|object|boolean|???)} result - The result from the calculation engine.
   * @returns {boolean} true or false
   */
  static doesResultPass(result) {
    if (result === true) {
      // Specifically a boolean true
      return true;
    } else if (result === false) {
      // Specifically a boolean false
      return false;
    } else if (Array.isArray(result)) {
      // Check if result is an array
      if (result.length === 0) {
        // Result is true if the array is not empty
        return false;
      } else if (result.length === 1 && result[0] === null) {
        // But if the array has one element that is null. Then we should make it red.
        return false;
      }
      return true;
    } else if (result instanceof cql.Interval) {
      // make it green if and Interval is returned
      return true;
      // Return false if an empty cql.Code is the result
    } else if (result instanceof cql.Code && result.code == null) {
      return false;
    } else if (result === null || result === undefined) {
      // Specifically no result
      return false;
    }
    return true;
  }

  /*
    * Iterate over episode results, call _buildPopulationRelevanceMap for each result
    * OR population relevances together so that populations are marked as relevant
    * based on all episodes instead of just one
    * @private
    * @param {episodeResults} result - Population_results for each episode
    * @returns {object} Map that tells if a population calculation was considered/relevant in any episode
    */
  static populationRelevanceForAllEpisodes(episodeResults) {
    const masterRelevanceMap = {};
    for (const key in episodeResults) {
      const episodeResult = episodeResults[key];
      const popRelMap = this.buildPopulationRelevanceMap(episodeResult);
      for (const pop in popRelMap) {
        const popRel = popRelMap[pop];
        if (masterRelevanceMap[pop] == null) {
          masterRelevanceMap[pop] = false;
        }
        masterRelevanceMap[pop] = masterRelevanceMap[pop] || popRel;
      }
    }
    return masterRelevanceMap;
  }

  /**
     * Builds the `population_relevance` map. This map gets added to the Result attributes that the calculator returns.
     *
     * The population_relevance map indicates which populations the patient was actually considered for inclusion in. It
     * is a simple map of "POPNAME" to true or false. true if the population was relevant/considered, false if
     * NOT relevant/considered. This is used later to determine which define statements are relevant in the calculation.
     *
     * For example: If they aren't in the IPP then they are not going to be considered for any other population and all other
     * populations will be marked NOT relevant.
     *
     * Below is an example result of this function (the 'population_relevance' map). DENEXCEP is not relevant because in
     * the population_results the NUMER was greater than zero:
     * {
     *   "IPP": true,
     *   "DENOM": true,
     *   "NUMER": true,
     *   "DENEXCEP": false
     * }
     *
     * This function is extremely verbose because this is an important and confusing calculation to make. The verbosity
     * was kept to make it more maintainable.
     * @private
     * @param {Result} result - The `population_results` object.
     * @returns {object} Map that tells if a population calculation was considered/relevant.
     */
  static buildPopulationRelevanceMap(result) {
    // initialize to true for every population
    const resultShown = {};
    _.each(Object.keys(result), (population) => { resultShown[population] = true; });

    // If STRAT is 0 then everything else is not calculated
    if (result.STRAT != null && result.STRAT === 0) {
      if (resultShown.IPP != null) {
        resultShown.IPP = false;
      }
      if (resultShown.NUMER != null) {
        resultShown.NUMER = false;
      }
      if (resultShown.NUMEX != null) {
        resultShown.NUMEX = false;
      }
      if (resultShown.DENOM != null) {
        resultShown.DENOM = false;
      }
      if (resultShown.DENEX != null) {
        resultShown.DENEX = false;
      }
      if (resultShown.DENEXCEP != null) {
        resultShown.DENEXCEP = false;
      }
      if (resultShown.MSRPOPL != null) {
        resultShown.MSRPOPL = false;
      }
      if (resultShown.MSRPOPLEX != null) {
        resultShown.MSRPOPLEX = false;
      }
      if (resultShown.observation_values != null) {
        resultShown.observation_values = false;
      }
    }

    // If IPP is 0 then everything else is not calculated
    if (result.IPP === 0) {
      if (resultShown.NUMER != null) {
        resultShown.NUMER = false;
      }
      if (resultShown.NUMEX != null) {
        resultShown.NUMEX = false;
      }
      if (resultShown.DENOM != null) {
        resultShown.DENOM = false;
      }
      if (resultShown.DENEX != null) {
        resultShown.DENEX = false;
      }
      if (resultShown.DENEXCEP != null) {
        resultShown.DENEXCEP = false;
      }
      if (resultShown.MSRPOPL != null) {
        resultShown.MSRPOPL = false;
      }
      if (resultShown.MSRPOPLEX != null) {
        resultShown.MSRPOPLEX = false;
      }
      // values is the OBSERVs
      if (resultShown.observation_values != null) {
        resultShown.observation_values = false;
      }
    }

    // If DENOM is 0 then DENEX, DENEXCEP, NUMER and NUMEX are not calculated
    if (result.DENOM != null && result.DENOM === 0) {
      if (resultShown.NUMER != null) {
        resultShown.NUMER = false;
      }
      if (resultShown.NUMEX != null) {
        resultShown.NUMEX = false;
      }
      if (resultShown.DENEX != null) {
        resultShown.DENEX = false;
      }
      if (resultShown.DENEXCEP != null) {
        resultShown.DENEXCEP = false;
      }
    }

    // If DENEX is greater than or equal to DENOM then NUMER, NUMEX and DENEXCEP not calculated
    if (result.DENEX != null && result.DENEX >= result.DENOM) {
      if (resultShown.NUMER != null) {
        resultShown.NUMER = false;
      }
      if (resultShown.NUMEX != null) {
        resultShown.NUMEX = false;
      }
      if (resultShown.DENEXCEP != null) {
        resultShown.DENEXCEP = false;
      }
    }

    // If NUMER is 0 then NUMEX is not calculated
    if (result.NUMER != null && result.NUMER === 0) {
      if (resultShown.NUMEX != null) {
        resultShown.NUMEX = false;
      }
    }

    // If NUMER is 1 then DENEXCEP is not calculated
    if (result.NUMER != null && result.NUMER >= 1) {
      if (resultShown.DENEXCEP != null) {
        resultShown.DENEXCEP = false;
      }
    }

    // If MSRPOPL is 0 then OBSERVs and MSRPOPLEX are not calculateed
    if (result.MSRPOPL != null && result.MSRPOPL === 0) {
      // values is the OBSERVs
      if (resultShown.observation_values != null) {
        resultShown.observation_values = false;
      }
      if (resultShown.MSRPOPLEX) {
        resultShown.MSRPOPLEX = false;
      }
    }

    // If MSRPOPLEX is greater than or equal to MSRPOPL then OBSERVs are not calculated
    if (result.MSRPOPLEX != null && result.MSRPOPLEX >= result.MSRPOPL) {
      if (resultShown.observation_values != null) {
        resultShown.observation_values = false;
      }
    }

    return resultShown;
  }
};
