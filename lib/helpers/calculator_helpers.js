const moment = require('moment');
const CqmModels = require('cqm-models');

/**
 * Contains helpers useful for calculation.
 */
module.exports = class CalculatorHelpers {
  /**
   * Create population values (aka results) for all populations in the population set using the results from the
   * calculator.
   * @param {Measure} measure - The measure we are getting the values for.
   * @param {Object} populationSet - The population set that we are mapping results to.
   * @param {Object} patientResults - The raw results object from the calculation engine for a patient.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {[object, object]} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results. Second result is the the episode results keyed by
   *   episode id and with the value being a set just like the patient results.
   */
  static createPopulationValues(measure, populationSet, patientResults, observationDefs) {
    let populationResults = {};
    let episodeResults = null;

    // patient based measure
    if (measure.calculation_method !== 'EPISODE_OF_CARE') {
      populationResults = this.createPatientPopulationValues(
        populationSet,
        patientResults,
        observationDefs
      );
      populationResults = this.handlePopulationValues(populationResults);
    } else {
      // episode of care based measure
      // collect results per episode
      episodeResults = this.createEpisodePopulationValues(
        populationSet,
        patientResults,
        observationDefs
      );

      // initialize population counts
      Object.keys(populationSet.populations.toObject()).forEach((popCode) => {
        populationResults[popCode] = 0;
        if (populationSet.observations.length > 0) {
          populationResults.observation_values = [];
        }
      });

      // count up all population results for a patient level count
      Object.keys(episodeResults).forEach((e) => {
        const episodeResult = episodeResults[e];
        Object.keys(episodeResult).forEach((popCode) => {
          const popResult = episodeResult[popCode];
          if (popCode === 'observation_values') {
            popResult.forEach((value) => {
              populationResults.observation_values.push(value);
            });
          } else {
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
        if (key === 'observation_values') {
          populationResultsHandled.observation_values = [];
        } else {
          populationResultsHandled[key] = 0;
        }
      });
    } else if (this.isValueZero('IPP', populationResults)) {
      Object.keys(populationResults).forEach((key) => {
        if (key !== 'STRAT') {
          if (key === 'observation_values') {
            populationResultsHandled.observation_values = [];
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
      if ('MSRPOPLEX' in populationResults) {
        populationResultsHandled.MSRPOPLEX = 0;
      }
      if ('observation_values' in populationResults) {
        populationResultsHandled.observation_values = [];
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
      if ('observation_values' in populationResults) {
        populationResultsHandled.observation_values = [];
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
   * @param {Population} populationSet - The population set we are getting the values for.
   * @param {Object} patientResults - The raw results object for a patient from the calculation engine.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {Object} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results.
   */
  static createPatientPopulationValues(populationSet, patientResults, observationDefs) {
    const populationResults = {};

    // Loop over all population codes ("IPP", "DENOM", etc.)
    Object.keys(populationSet.populations.toObject()).forEach((popCode) => {
      const cqlPopulation = populationSet.populations[popCode].statement_name;
      // Is there a patient result for this population? and does this populationCriteria contain the population
      // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
      // Grab CQL result value and adjust for ECQME
      const value = patientResults[cqlPopulation];
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
        if (!populationResults.observation_values) {
          populationResults.observation_values = [];
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
            populationResults.observation_values.push(obsResult.observation.value);
          } else {
            // In all other cases, add result
            populationResults.observation_values.push(obsResult.observation);
          }
        });
      });
    }

    return populationResults;
  }

  /**
   * Create population values (aka results) for all episodes using the results from the calculator. This is
   * used only for the episode of care measures
   * @param {Population} populationSet - The populationSet we are getting the values for.
   * @param {Object} patientResults - The raw results object for the patient from the calculation engine.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {Object} The episode results. Map of episode id to population results which is a map of "POPNAME"
   * to Integer result. Except for OBSERVs, their key is 'value' and value is an array of results.
   */
  static createEpisodePopulationValues(populationSet, patientResults, observationDefs) {
    const episodeResults = {};

    for (const popCode in populationSet.populations.toObject()) {
      let newEpisode;
      const cqlPopulation = populationSet.populations[popCode];
      // Is there a patient result for this population? and does this populationCriteria contain the population
      // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
      // Grab CQL result value and store for each episode found
      const qdmDataElements = patientResults[cqlPopulation.statement_name];
      if (Array.isArray(qdmDataElements)) {
        qdmDataElements.forEach((qdmDataElement) => {
          if (qdmDataElement.id != null) {
            // if an episode has already been created set the result for the population to 1
            if (episodeResults[qdmDataElement.id]) {
              episodeResults[qdmDataElement.id][popCode] = 1;
              // else create a new episode using the list of all popcodes for the population
            } else {
              newEpisode = {};
              for (const pc in populationSet.populations.toObject()) {
                newEpisode[pc] = 0;
              }

              newEpisode[popCode] = 1;
              episodeResults[qdmDataElement.id] = newEpisode;
            }
          }
        });
      }
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
          const episodeId = obsResult.episode.id;
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
            if (episodeResults[episodeId].observation_values != null) {
              episodeResults[episodeId].observation_values.push(resultValue);
            } else {
              episodeResults[episodeId].observation_values = [resultValue];
            }
            // else create a new episodeResult structure
          } else {
            const newEpisode = {};
            for (const pc in populationSet.populations.toObject()) {
              newEpisode[pc] = 0;
            }
            newEpisode.observation_values = [resultValue];
            episodeResults[episodeId] = newEpisode;
          }
        });
      });
    }

    // Correct any inconsistencies. ex. In DENEX but also in NUMER using same function used for patients.
    Object.keys(episodeResults).forEach((episodeId) => {
      const episodeResult = episodeResults[episodeId];
      // ensure that an empty 'observation_values' array exists for continuous variable measures if there were no observations
      if (populationSet.observations.length > 0) {
        if (!episodeResult.observation_values) {
          episodeResult.observation_values = [];
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
        if (!valueSets[valueSet.oid]) {
          valueSets[valueSet.oid] = {};
        }
        valueSet.concepts.forEach((concept) => {
          let version = valueSet.version;
          if (version === 'N/A') {
            version = '';
          }
          if (!valueSets[valueSet.oid][version]) {
            valueSets[valueSet.oid][version] = [];
          }
          valueSets[valueSet.oid][version].push({
            code: concept.code,
            system: concept.code_system_oid,
            version,
          });
        });
      }
    });
    return valueSets;
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

  static deepCopyPopulationSet(original) {
    const copy = {};
    copy.title = original.title;
    copy.observations = original.observations;
    copy.populations = {};
    for (const popCode in original.populations.toObject()) {
      // skip codes starting with _ since they are mongoose metadata
      const copyPop = {};
      copyPop.library_name = original.populations[popCode].library_name;
      copyPop.statement_name = original.populations[popCode].statement_name;
      copy.populations[popCode] = copyPop;
    }
    return new CqmModels.PopulationSet(copy);
  }

  static getStratificationsAsPopulationSets(measure) {
    const stratificationsAsPopulationSets = [];
    measure.population_sets.forEach((populationSet) => {
      if (populationSet.stratifications) {
        populationSet.stratifications.forEach((stratification) => {
          const clonedSet = this.deepCopyPopulationSet(populationSet);
          clonedSet.population_set_id = stratification.stratification_id;
          clonedSet.populations.STRAT = stratification.statement;
          stratificationsAsPopulationSets.push(clonedSet);
        });
      }
    });
    return stratificationsAsPopulationSets;
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
                      asType: '{urn:hl7-org:elm-types:r1}Tuple',
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
