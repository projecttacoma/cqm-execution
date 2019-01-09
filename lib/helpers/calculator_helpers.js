const moment = require('moment');
const Measure = require('cqm-models').Measure();

/**
 * Contains helpers useful for calculation.
 */
module.exports = class CalculatorHelpers {
  /**
   * Create population values (aka results) for all populations in the population set using the results from the
   * calculator.
   * @param {Measure} measure - The measure we are getting the values for.
   * @param {Object} population - The population set that we are mapping results to.
   * @param {Object} results - The raw results object from the calculation engine.
   * @param {Patient} patientId - The patient ID we are getting results for.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @param {Integer} populationIndex - Index of the population set of which the population belongs to
   * @returns {[object, object]} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results. Second result is the the episode results keyed by
   *   episode id and with the value being a set just like the patient results.
   */
  static createPopulationValues(measure, populationSet, patientResults, observationDefs) {
    let populationResults = {};
    let episodeResults = null;

    // patient based measure
    if (measure.calculation_method != "EPISODE_OF_CARE") {
      populationResults = this.createPatientPopulationValues(
        measure,
        populationSet,
        patientResults,
        observationDefs
      );
      populationResults = this.handlePopulationValues(populationResults);
    } else {
      // episode of care based measure
      // collect results per episode
      episodeResults = this.createEpisodePopulationValues(
        measure,
        populationSet,
        patientResults,
        observationDefs
      );

      // initialize population counts
      Object.keys(populationSet.populations).forEach((popCode) => {
        if (popCode[0] == '_'){
            populationResults[popCode] = 0;
        }
      });

      // count up all population results for a patient level count
      Object.keys(episodeResults).forEach((e) => {
        const episodeResult = episodeResults[e];
        Object.keys(episodeResult).forEach((popCode) => {
          const popResult = episodeResult[popCode];
          if (popCode === 'values') {
            popResult.forEach((value) => {
              populationResults.values.push(value);
            });
          } else if (popCode[0] == '_'){
            populationResults[popCode] += popResult;
          }
        });
      });
    }
    return [populationResults, episodeResults];
  }

  /**
   * Takes in the initial values from result object and checks to see if some values should not be calculated. These
   * values that should not be calculated are zeroed out.
   * @param {object} populationResults - The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results.
   * @returns {object} Population results in the same structure as passed in, but the appropiate values are zeroed out.
   */
  static handlePopulationValues(populationResults) {
    /* Setting values of populations if the correct populations are not set based on the following logic guidelines
     * Initial Population (IPP): The set of patients or episodes of care to be evaluated by the measure.
     * Denominator (DENOM): A subset of the IPP.
     * Denominator Exclusions (DENEX): A subset of the Denominator that should not be considered for inclusion in the Numerator.
     * Denominator Exceptions (DEXCEP): A subset of the Denominator. Only those members of the Denominator that are considered
     * for Numerator membership and are not included are considered for membership in the Denominator Exceptions.
     * Numerator (NUMER): A subset of the Denominator. The Numerator criteria are the processes or outcomes expected for each patient,
     * procedure, or other unit of measurement defined in the Denominator.
     * Numerator Exclusions (NUMEX): A subset of the Numerator that should not be considered for calculation.
     * Measure Poplation Exclusions (MSRPOPLEX): Identify that subset of the MSRPOPL that meet the MSRPOPLEX criteria.
     */
    const populationResultsHandled = populationResults;
    if (populationResultsHandled.STRAT != null && this.isValueZero('STRAT', populationResults)) {
      // Set all values to 0
      Object.keys(populationResults).forEach((key) => {
        if (key === 'values') {
          populationResultsHandled.values = [];
        } else {
          populationResultsHandled[key] = 0;
        }
      });
    } else if (this.isValueZero('IPP', populationResults)) {
      Object.keys(populationResults).forEach((key) => {
        if (key !== 'STRAT') {
          if (key === 'values') {
            populationResultsHandled.values = [];
          } else {
            populationResultsHandled[key] = 0;
          }
        }
      });
    } else if (this.isValueZero('DENOM', populationResults) || this.isValueZero('MSRPOPL', populationResults)) {
      if ('DENEX' in populationResults) {
        populationResultsHandled.DENEX = 0;
      }
      if ('DENEXCEP' in populationResults) {
        populationResultsHandled.DENEXCEP = 0;
      }
      if ('NUMER' in populationResults) {
        populationResultsHandled.NUMER = 0;
      }
      if ('NUMEX' in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
      if ('values' in populationResults) {
        populationResultsHandled.values = [];
      }
      // Can not be in the numerator if the same or more are excluded from the denominator
    } else if (populationResults.DENEX != null && !this.isValueZero('DENEX', populationResults) && populationResults.DENEX >= populationResults.DENOM) {
      if ('NUMER' in populationResults) {
        populationResultsHandled.NUMER = 0;
      }
      if ('NUMEX' in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
      if ('DENEXCEP' in populationResults) {
        populationResultsHandled.DENEXCEP = 0;
      }
    } else if (populationResults.MSRPOPLEX != null && !this.isValueZero('MSRPOPLEX', populationResults)) {
      if ('values' in populationResults) {
        populationResultsHandled.values = [];
      }
    } else if (this.isValueZero('NUMER', populationResults)) {
      if ('NUMEX' in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
    } else if (!this.isValueZero('NUMER', populationResults)) {
      if ('DENEXCEP' in populationResults) {
        populationResultsHandled.DENEXCEP = 0;
      }
    }
    return populationResultsHandled;
  }

  /**
   * Create patient population values (aka results) for all populations in the population set using the results from the
   * calculator.
   * @param {Measure} measure - The measure of the population set.
   * @param {Population} population - The population set we are getting the values for.
   * @param {Object} results - The raw results object from the calculation engine.
   * @param {Patient} patientId - The patientId representing the patient we are getting results for.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @param {Integer} populationIndex - Index of the population set
   * @returns {Object} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results.
   */
  static createPatientPopulationValues(measure, populationSet, patientResults, observationDefs) {
    const populationResults = {};

    // Loop over all population codes ("IPP", "DENOM", etc.)
    Object.keys(populationSet.populations).forEach((popCode) => {
      let value;
      if (popCode[0] == '_') return;

      const cqlPopulation = populationSet.populations[popCode].statement_name;

      // Is there a patient result for this population? and does this populationCriteria contain the population
      // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
      // Grab CQL result value and adjust for ECQME
      value = patientResults[cqlPopulation];
      if (Array.isArray(value) && value.length > 0) {
        populationResults[popCode] = value.length;
      } else if (typeof value === 'boolean' && value) {
        populationResults[popCode] = 1;
      } else {
        populationResults[popCode] = 0;
      }
    });
    if ((observationDefs != null ? observationDefs.length : undefined) > 0) {
      // Handle observations using the names of the define statements that
      // were added to the ELM to call the observation functions.
      observationDefs.forEach((obDef) => {
        if (!populationResults.values) {
          populationResults.values = [];
        }
        // Observations only have one result, based on how the HQMF is
        // structured (note the single 'value' section in the
        // measureObservationDefinition clause).
        const obsResults =
          patientResults != null
            ? patientResults[obDef]
            : undefined;

        obsResults.forEach((obsResult) => {
          // Add the single result value to the values array on the results of
          // this calculation (allowing for more than one possible observation).
          if (obsResult != null ? Object.prototype.hasOwnProperty.call(obsResult, 'value') : undefined) {
            // If result is a Cql.Quantity type, add its value
            populationResults.values.push(obsResult.observation.value);
          } else {
            // In all other cases, add result
            populationResults.values.push(obsResult.observation);
          }
        });
      });
    }

    return populationResults;
  }

  /**
   * Create population values (aka results) for all episodes using the results from the calculator. This is
   * used only for the episode of care measures
   * @param {Measure} measure - The measure of the population set
   * @param {Population} population - The population set we are getting the values for.
   * @param {Object} results - The raw results object from the calculation engine.
   * @param {String} patientId - The patient ID we are getting results for.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {Object} The episode results. Map of episode id to population results which is a map of "POPNAME"
   * to Integer result. Except for OBSERVs, their key is 'value' and value is an array of results.
   */
  static createEpisodePopulationValues(measure, populationSet, patientResults, observationDefs) {
    const episodeResults = {};

    for (var popCode in populationSet.populations) {
      if (popCode[0] == '_') {
        continue;
      }
      let newEpisode;
      let qdmDataElements;
      const cqlPopulation = populationSet.populations[popCode]
      // Is there a patient result for this population? and does this populationCriteria contain the population
      // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
      // Grab CQL result value and store for each episode found
      qdmDataElements = patientResults[cqlPopulation.statement_name];
      if (Array.isArray(qdmDataElements)) {
        qdmDataElements.forEach((qdmDataElement) => {
          if (qdmDataElement.id != null) {
            // if an episode has already been created set the result for the population to 1
            if (episodeResults[qdmDataElement.id.value]) {
              episodeResults[qdmDataElement.id.value][popCode] = 1;
              // else create a new episode using the list of all popcodes for the population
            } else {
              newEpisode = {};
              for (var pc in populationSet.populations) {
                if (pc[0] != '_') {
                  newEpisode[pc] = 0;
                }
              }

              newEpisode[popCode] = 1;
              episodeResults[qdmDataElement.id.value] = newEpisode;
            }
          }
        });
      }
      if ((observationDefs != null ? observationDefs.length : undefined) > 0) {
        // Handle observations using the names of the define statements that
        // were added to the ELM to call the observation functions.
        observationDefs.forEach((obDef) => {
          // Observations only have one result, based on how the HQMF is
          // structured (note the single 'value' section in the
          // measureObservationDefinition clause).
          const obsResults =
            patientResults != null
              ? patientResults[obDef]
              : undefined;

          obsResults.forEach((obsResult) => {
            let resultValue = null;
            const episodeId = obsResult.episode.id.value;
            // Add the single result value to the values array on the results of
            // this calculation (allowing for more than one possible observation).
            if (obsResult != null ? Object.prototype.hasOwnProperty.call(obsResult, 'value') : undefined) {
              // If result is a Cql.Quantity type, add its value
              resultValue = obsResult.observation.value;
            } else {
              // In all other cases, add result
              resultValue = obsResult.observation;
            }

            // if the episodeResult object already exist create or add to to the values structure
            if (episodeResults[episodeId] != null) {
              if (episodeResults[episodeId].values != null) {
                episodeResults[episodeId].values.push(resultValue);
              } else {
                episodeResults[episodeId].values = [resultValue];
              }
              // else create a new episodeResult structure
            } else {
              newEpisode = {};
              for (var pc in populationSet.populations) {
                if (pc[0] != '_') {
                  newEpisode[pc] = 0;
                }
              }
              newEpisode.values = [resultValue];
              episodeResults[episodeId] = newEpisode;
            }
          });
        });
      }
    }

    // Correct any inconsistencies. ex. In DENEX but also in NUMER using same function used for patients.
    Object.keys(episodeResults).forEach((episodeId) => {
      const episodeResult = episodeResults[episodeId];
      // ensure that an empty 'values' array exists for continuous variable measures if there were no observations
      if ([].indexOf.call(popCodesInPopulation, 'OBSERV') >= 0) {
        if (!episodeResult.values) {
          episodeResult.values = [];
        }
      }
      // Correct any inconsistencies. ex. In DENEX but also in NUMER using same function used for patients.
      episodeResults[episodeId] = this.handlePopulationValues(episodeResult);
    });

    return episodeResults;
  }

  // Set all value set versions to 'undefined' so the execution engine does not grab the specified version in the ELM
  static setValueSetVersionsToUndefined(elm) {
    Array.from(elm).forEach((elmLibrary) => {
      if (elmLibrary.library.valueSets != null) {
        Array.from(elmLibrary.library.valueSets.def).forEach((valueSet) => {
          if (valueSet.version != null) {
            valueSet.version = undefined;
          }
        });
      }
    });
    return elm;
  }

  // Format ValueSets for use by the execution engine
  static valueSetsForCodeService(valueSetsArray) {
    const valueSets = {};
    valueSetsArray.forEach((valueSet) => {
      if (valueSet.concepts) {
        if(!valueSets[valueSet.oid]){
          valueSets[valueSet.oid] = {}
        }
        valueSet.concepts.forEach((concept) => {
          let version = valueSet.version
          if(version == "N/A"){
            version = ""
          }
          if(!valueSets[valueSet.oid][version]){
            valueSets[valueSet.oid][version] = []
          }
          valueSets[valueSet.oid][version].push({
            code: concept.code,
            system: concept.code_system_name,
            version: version,
          });
        });
      }
    });
    return valueSets;
  }

  /**
   * Get the index of the STRAT in the cql_populations_map based on its name
   * TODO: This function will be irrelevant once we start using the new measure model
   * @private
   * @param {string} stratName - Strat name to parse index out of ie: STRAT, STRAT_1, STRAT_2...
   */
  static getStratIndexFromStratName(stratName) {
    const stratIndex = stratName.match(new RegExp('STRAT_(\\d*)'));
    if ((stratIndex != null ? stratIndex[1] : undefined) != null) {
      return parseInt(stratIndex[1], 10);
    }
    return 0;
  }

  // Helper function that returns the correct population for the popCode from definedPops
  static getPopulationFromIndex(definedPops, populationIndex, population, popCode) {
    let cqlPopulation = definedPops[populationIndex];
    if (population.population_index != null && popCode !== 'STRAT') {
      cqlPopulation = definedPops[population.population_index];
    } else if (popCode === 'STRAT' && population.STRAT != null) {
      const stratName = population.STRAT;
      const stratificationIndex = this.getStratIndexFromStratName(stratName);
      cqlPopulation = definedPops[stratificationIndex];
    }
    return cqlPopulation;
  }

  // Create Date from UTC string date and time using momentJS
  static parseTimeStringAsUTC(timeValue) {
    return moment.utc(timeValue, 'YYYYMDDHHmm').toDate();
  }

  // Create Date from UTC string date and time using momentJS, shifting to 11:59:59 of the given year
  static parseTimeStringAsUTCConvertingToEndOfYear(timeValue) {
    return moment
      .utc(timeValue, 'YYYYMDDHHmm')
      .add(1, 'years')
      .subtract(1, 'seconds')
      .toDate();
  }

  // If the given value is in the given populationSet, and its result is zero, return true.
  static isValueZero(value, populationSet) {
    if (value in populationSet && populationSet[value] === 0) {
      return true;
    }
    return false;
  }

  // Returns a JSON function to add to the ELM before ELM JSON is used to calculate results
  // This ELM template was generated by the CQL-to-ELM Translation Service.
  static generateELMJSONFunction(functionName, parameter) {
    const elmFunction = {
      name: `obs_func_${functionName}`,
      context: 'Patient',
      accessLevel: 'Public',
      expression: {
        type: 'Query',
        source: [
          {
            alias: 'MP',
            expression: {
              name: parameter,
              type: 'ExpressionRef',
            },
          },
        ],
        relationship: [],
        return: {
          distinct: false,
          expression: {
            type: 'Tuple',
            element: [
              {
                name: 'episode',
                value: {
                  name: 'MP',
                  type: 'AliasRef',
                },
              },
              {
                name: 'observation',
                value: {
                  name: functionName,
                  type: 'FunctionRef',
                  operand: [
                    {
                      type: 'As',
                      operand: {
                        name: 'MP',
                        type: 'AliasRef',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    };
    return elmFunction;
  }
};
