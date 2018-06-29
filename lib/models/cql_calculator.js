/**
 * The CQL calculator. This calls the cql-execution framework and formats the results as neccesary for Bonnie
 * and Cypress.
 */
const _ = require('lodash');
const moment = require('moment');
const CqmModels = require('cqm-models');
const Cql = require('cqm-models').CQL;
const Measure = require('cqm-models').Measure();
const ResultsHelper = require('../helpers/results_helper.js');

module.exports = class CQLCalculator {
  /**
   * Generate a calculation result for a population / patient pair; this always returns a result immediately,
   * but may return a blank result object if there was a problem. Currently we do not do CQL calculations in
   * deferred manner like we did for QDM calcuations.
   * @param {Measure} measure - The measure population to calculate on.
   * @param {PatientSource} patientSource - The patientSource to run calculations on.
   * @param {Hash} valueSetsByOid - all ValueSets relevant to the measure, hashes match thouse in the value sets ar
   * @param {Hash} options - contains options for measure calculation, particularly relevant is effective_date
   */
  calculate(measure, patientSource, valueSetsByOid, options) {
    // We store both the calculation result and the calculation code based on keys derived from the arguments
    let generatedELMJSON;

    const resultsByPatient = {};

    this.valueSetsByOid = valueSetsByOid;

    // Grab start and end of Measurement Period
    let start;
    let end;
    // Override default measure_period with effective_date if available
    if (options && options.effective_date != null) {
      start = this.constructor.getConvertedTime(options.effective_date);
      if (options.effective_date_end != null) {
        end = this.constructor.getConvertedTime(options.effective_date_end);
      } else {
        end = this.constructor.getConvertedTimeEndOfYear(options.effective_date);
      }
    } else {
      start = this.constructor.getConvertedTime(measure.measure_period.low.value);
      end = this.constructor.getConvertedTime(measure.measure_period.high.value);
    }

    const startCql = Cql.DateTime.fromDate(start, 0); // No timezone offset for start
    const endCql = Cql.DateTime.fromDate(end, 0); // No timezone offset for stop

    // Construct CQL params
    const params = { 'Measurement Period': new Cql.Interval(startCql, endCql) };

    // Grab ELM JSON from measure, use clone so that the function added from observations does not get added over and over again
    const elm = _.clone(measure.elm);

    // Find the main library (the library that is the "measure") and
    // grab the version to pass into the execution engine
    let mainLibraryVersion = '';
    let mainLibraryIndex = 0;
    for (let index = 0; index < elm.length; index += 1) {
      const elmLibrary = elm[index];
      if (elmLibrary.library.identifier.id === measure.main_cql_library) {
        mainLibraryVersion = elmLibrary.library.identifier.version;
        mainLibraryIndex = index;
      }
    }

    const observations = measure.observations;
    const observationDefs = [];
    if (observations) {
      observations.forEach((obs) => {
        generatedELMJSON = this.constructor.generateELMJSONFunction(
          obs.function_name,
          obs.parameter
        );
        // Save the name of the generated define statement, so we can check
        // its result later in the CQL calculation process. These added
        // define statements are called 'EcqmeFunction_' followed by the
        // name of the function - see the 'generateELMJSONFunction' function.
        observationDefs.push(`EcqmeFunction_${obs.function_name}`);
        // Check to see if the gneratedELMJSON function is already in the definitions
        // Added a check to support old ELM representation and new Array representation.
        elm[mainLibraryIndex].library.statements.def.push(generatedELMJSON);
      });
    }

    // Set all value set versions to 'undefined' so the execution engine does not grab the specified version in the ELM
    elm.forEach((elmLibrary) => {
      elmLibrary.library.valueSets.def.forEach((valueSetParam) => {
        const valueSet = valueSetParam;
        if (valueSet.version != null) {
          valueSet.version = undefined;
        }
      });
    });

    // TODO right now this just grabs the first value set, doesn't look like we ever pass multiple versions
    // Grab the correct version of value sets to pass into the exectuion engine.
    const measureValueSets = this.valueSetsForCodeService(measure.value_set_oids);

    // Calculate results for each CQL statement
    const resultsRaw =
        this.constructor.executeEngine(
          elm, patientSource, measureValueSets,
          measure.main_cql_library, mainLibraryVersion, params,
        );

    Object.keys(resultsRaw.patientResults).forEach((patientId) => {
      var populationResults;
      var episodeResults;
      // Parse CQL statement results into population values
      measure.populations.forEach((population) => {
         [populationResults, episodeResults] =
              Array.from(this.createPopulationValues(
                measure, population, resultsRaw,
                patientId, observationDefs
              ));
        // All of the following until the final result set patient_id may no longer be needed.
        if (populationResults != null) {
          var result = CqmModels.IndividualResult();
          var populationRelevance = {};
          var statementRelevance = {};
          result.set(populationResults);

          if (episodeResults != null) {
            // In episode of care based measures, episodeResults contains the population results
            // for EACH episode.
            result.episode_results = episodeResults;
            if(Object.keys(episodeResults).length > 0){
              /* In episode of care based measures, episode_results contains the population results
               * for EACH episode, so we need to build population_relevance based on a combonation
               * of the episode_results. IE: If DENEX is irrelevant for one episode but relevant for
               * another, the logic view should not highlight it as irrelevant
               */
              populationRelevance = ResultsHelper.populationRelevanceForAllEpisodes(episodeResults);
            }else{
              // Use the patient based relevance if there are no episodes. This will properly set IPP or STRAT to true.
              populationRelevance = ResultsHelper.buildPopulationRelevanceMap(populationResults);
            }
          }else{
            // Calculate relevance for patient based measure
            populationRelevance = ResultsHelper.buildPopulationRelevanceMap(populationResults);
          }
          
          statementRelevance = ResultsHelper.buildStatementRelevanceMap(populationRelevance, measure, population);
          console.log("STATEMENTRELEVANCE");
          console.log(statementRelevance);

          // Populate result with info
          result.patient = patientId;
          result.measure = measure._id;
          result.state = 'complete';

          // Add result of population set, hashed by population set idc
          if(!resultsByPatient[patientId]){
            resultsByPatient[patientId] = {};
          }
          resultsByPatient[patientId][population.id] = result;
        }
      });
    });
    return resultsByPatient;
  }

  static executeEngine(elm, patientSource, valueSets, libraryName, version, parameters = {}) {
    let lib;
    let rep;
    if (Array.isArray(elm)) {
      if (elm.length > 1) {
        rep = new Cql.Repository(elm);
        lib = rep.resolve(libraryName, version);
      } else {
        lib = new Cql.Library(elm[0]);
      }
    } else {
      lib = new Cql.Library(elm);
    }
    const codeService = new Cql.CodeService(valueSets);
    const executor = new Cql.Executor(lib, codeService, parameters);
    return executor.exec(patientSource);
  }

  /**
   * Create population values (aka results) for all populations in the population set using the results from the
   * calculator.
   * @param {Measure} measure - The measure we are getting the values for.
   * @param {object} results - The raw results object from the calculation engine.
   * @param {Patient} patientId - The patient ID we are getting results for.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {[object, object]} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results. Second result is the the episode results keyed by
   *   episode id and with the value being a set just like the patient results.
   */
  createPopulationValues(measure, population, results, patientId, observationDefs) {
    let populationResults = {};
    let episodeResults = null;

    // patient based measure
    if (!measure.episode_of_care) {
      populationResults =
        this.createPatientPopulationValues(
          measure, population,
          results, patientId, observationDefs
        );
      populationResults = this.handlePopulationValues(populationResults);
    } else { // episode of care based measure
      // collect results per episode
      episodeResults =
        this.createEpisodePopulationValues(
          measure, population,
          results, patientId, observationDefs,
        );

      // initialize population counts
      Measure.ALL_POPULATION_CODES.forEach((popCode) => {
        if (population[popCode]) {
          if (popCode === 'OBSERV') {
            populationResults.values = [];
          } else {
            populationResults[popCode] = 0;
          }
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
  handlePopulationValues(populationResults) {
    /* Setting values of populations if the correct populations are not set based on the following logic guidelines
     * Initial Population (IPP): The set of patients or episodes of care to be evaluated by the measure.
     * Denominator (DENOM): A subset of the IPP.
     * Denominator Exclusions (DENEX): A subset of the Denominator that should not be considered for inclusion in the Numerator.
     * Denominator Exceptions (DEXCEP): A subset of the Denominator. Only those members of the Denominator that are considered
     * for Numerator membership and are not included are considered for membership in the Denominator Exceptions.
     * Numerator (NUMER): A subset of the Denominator. The Numerator criteria are the processes or outcomes expected for each patient,
     * procedure, or other unit of measurement defined in the Denominator.
     * Numerator Exclusions (NUMEX): A subset of the Numerator that should not be considered for calculation.
     */
    const populationResultsHandled = populationResults;
    if ((populationResultsHandled.STRAT != null) &&
        this.constructor.isValueZero('STRAT', populationResults)) { // Set all values to 0
      Object.keys(populationResults).forEach((key) => {
        if (key === 'values') {
          populationResultsHandled.values = [];
        } else {
          populationResultsHandled[key] = 0;
        }
      });
    } else if (this.constructor.isValueZero('IPP', populationResults)) {
      Object.keys(populationResults).forEach((key) => {
        if (key !== 'STRAT') {
          if (key === 'values') {
            populationResultsHandled.values = [];
          } else {
            populationResultsHandled[key] = 0;
          }
        }
      });
    } else if (this.constructor.isValueZero('DENOM', populationResults) ||
               this.constructor.isValueZero('MSRPOPL', populationResults)) {
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
    } else if ((populationResults.DENEX != null) &&
               !this.constructor.isValueZero('DENEX', populationResults) &&
               (populationResults.DENEX >= populationResults.DENOM)) {
      if ('NUMER' in populationResults) {
        populationResultsHandled.NUMER = 0;
      }
      if ('NUMEX' in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
     else if (populationResults.MSRPOPLEX != null && 
              !this.constructor.isValueZero('MSRPOPLEX', populationResults))
      if ('values' in populationResults) {
        populationResults.values = []
      }
    } else if (this.constructor.isValueZero('NUMER', populationResults)) {
      if ('NUMEX' in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
    } else if (!this.constructor.isValueZero('NUMER', populationResults)) {
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
   * @param {object} results - The raw results object from the calculation engine.
   * @param {Patient} patientId - The patientId representing the patient we are getting results for.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {object} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results.
   */
  createPatientPopulationValues(measure, population, results, patientId, observationDefs) {
    const populationResults = {};
    // Grab the mapping between populations and CQL statements
    const cqlMap = measure.populations_cql_map;
    // Loop over all population codes ("IPP", "DENOM", etc.)
    Measure.ALL_POPULATION_CODES.forEach((popCode) => {
      let value;
      if (cqlMap[popCode]) {
        // This code is supporting measures that were uploaded
        // before the parser returned multiple populations in an array.
        // TODO: Remove this check when we move over to production.
        let definedPops;
        if (_.isString(cqlMap[popCode])) {
          definedPops = [cqlMap[popCode]];
        } else {
          definedPops = cqlMap[popCode];
        }

        const popIndex = this.constructor.getPopIndexFromPopName(measure, population, popCode);
        const cqlPopulation = definedPops[popIndex];
        // Is there a patient result for this population? and does this populationCriteria contain the population
        // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
        if (population[popCode] != null) {
          // Grab CQL result value and adjust for ECQME
          value = results.patientResults[patientId][cqlPopulation];
          if (Array.isArray(value) && (value.length > 0)) {
            populationResults[popCode] = value.length;
          } else if ((typeof value === 'boolean') && value) {
            populationResults[popCode] = 1;
          } else {
            populationResults[popCode] = 0;
          }
        }
      } else if ((popCode === 'OBSERV') &&
                 ((observationDefs != null ? observationDefs.length : undefined) > 0)) {
        // Handle observations using the names of the define statements that
        // were added to the ELM to call the observation functions.
        observationDefs.forEach((obDef) => {
          if (!populationResults.values) { populationResults.values = []; }
          // Observations only have one result, based on how the HQMF is
          // structured (note the single 'value' section in the
          // measureObservationDefinition clause).
          const obsResults =
            (results.patientResults != null && results.patientResults[patientId] != null) ?
              results.patientResults[patientId][obDef] : undefined;

          obsResults.forEach((obsResult) => {
            // Add the single result value to the values array on the results of
            // this calculation (allowing for more than one possible observation).
            if ((obsResult != null ? Object.prototype.hasOwnProperty
              .call(obsResult, 'value') : undefined)) {
              // If result is a Cql.Quantity type, add its value
              populationResults.values.push(obsResult.observation.value);
            } else {
              // In all other cases, add result
              populationResults.values.push(obsResult.observation);
            }
          });
        });
      }
    });
    return populationResults;
  }

  /**
   * Create population values (aka results) for all episodes using the results from the calculator. This is
   * used only for the episode of care measures
   * @param {Measure} measure - The measure of the population set
   * @param {Population} population - The population set we are getting the values for.
   * @param {object} results - The raw results object from the calculation engine.
   * @param {Patient} patientId - The patient ID we are getting results for.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {object} The episode results. Map of episode id to population results which is a map of "POPNAME"
   * to Integer result. Except for OBSERVs, their key is 'value' and value is an array of results.
   */
  createEpisodePopulationValues(measure, population, results, patientId, observationDefs) {
    const episodeResults = {};
    // Grab the mapping between populations and CQL statements
    const cqlMap = measure.populations_cql_map;
    // Loop over all population codes ("IPP", "DENOM", etc.) to deterine ones included in this population.
    const popCodesInPopulation = [];
    Measure.ALL_POPULATION_CODES.forEach((popCode) => {
      if (population[popCode] != null) {
        popCodesInPopulation.push(popCode);
      }
    });

    popCodesInPopulation.forEach((popCode) => {
      let newEpisode;
      let values;
      if (cqlMap[popCode]) {
        const definedPops = cqlMap[popCode];

        const popIndex = this.constructor.getPopIndexFromPopName(measure, population, popCode);

        const cqlPopulation = definedPops[popIndex];
        // Is there a patient result for this population? and does this populationCriteria contain the population
        // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
        if (population[popCode] != null) {
          // Grab CQL result value and store for each episode found
          values = results.patientResults[patientId][cqlPopulation];
          if (Array.isArray(values)) {
            values.forEach((value) => {
              if (value._id != null) {
                // if an episode has already been created set the result for the population to 1
                if (episodeResults[value._id.toString()]) {
                  episodeResults[value._id.toString()][popCode] = 1;

                // else create a new episode using the list of all popcodes for the population
                } else {
                  newEpisode = { };
                  popCodesInPopulation.forEach((pop) => {
                    if (pop !== 'OBSERV') { newEpisode[pop] = 0; }
                  });

                  newEpisode[popCode] = 1;
                  episodeResults[value._id.toString()] = newEpisode;
                }
              }
            });
          } else if (typeof console !== 'undefined' && console !== null) {
            // TODO: Potentially introduce new warning here
            // console.log('WARNING: CQL Results not an array');
          }
        }
      } else if ((popCode === 'OBSERV') &&
        ((observationDefs != null ? observationDefs.length : undefined) > 0)) {
        // Handle observations using the names of the define statements that
        // were added to the ELM to call the observation functions.
        observationDefs.forEach((obDef) => {
          // Observations only have one result, based on how the HQMF is
          // structured (note the single 'value' section in the
          // measureObservationDefinition clause).
          const obsResults =
            (results.patientResults != null && results.patientResults[patientId] != null) ?
              results.patientResults[patientId][obDef] : undefined;

          obsResults.forEach((obsResult) => {
            let resultValue = null;
            const episodeId = obsResult.episode._id.toString();
            // Add the single result value to the values array on the results of
            // this calculation (allowing for more than one possible observation).
            if ((obsResult != null ? Object.prototype.hasOwnProperty
              .call(obsResult, 'value') : undefined)) {
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
              newEpisode = { };
              popCodesInPopulation.forEach((pop) => {
                if (pop !== 'OBSERV') { newEpisode[pop] = 0; }
              });
              newEpisode.values = [resultValue];
              episodeResults[episodeId] = newEpisode;
            }
          });
        });
      } else if ((popCode === 'OBSERV') &&
                 ((observationDefs != null ? observationDefs.length : undefined) <= 0)) {
        if (typeof console !== 'undefined' && console !== null) {
          // TODO: Potentially introduce new warning here
          // console.log('WARNING: No function definition injected for OBSERV');
        }
      }
    });

    // Correct any inconsistencies. ex. In DENEX but also in NUMER using same function used for patients.
    Object.keys(episodeResults).forEach((episodeId) => {
      const episodeResult = episodeResults[episodeId];
      episodeResults[episodeId] = this.handlePopulationValues(episodeResult);
    });

    return episodeResults;
  }

  static getPopIndexFromPopName(measure, population, popName) {
    if (population.stratification) {
      return popName === 'STRAT' ? population.stratification_index : population.population_index;
    }
    return _.findIndex(measure.populations, p => p === population);
  }

  // Format ValueSets for use by CQL4Browsers
  valueSetsForCodeService(valueSetOids = []) {
    const valueSets = {};
    valueSetOids.forEach((oid) => {
      var specificValueSet = this.valueSetsByOid[oid];
      if (specificValueSet && !specificValueSet[Object.keys(specificValueSet)[0]].concepts) {
        return;
      }else{
        specificValueSet = specificValueSet[Object.keys(specificValueSet)[0]];
      }
      if (!valueSets[specificValueSet.oid]) { valueSets[specificValueSet.oid] = {}; }
      if (!valueSets[specificValueSet.oid][specificValueSet.version]) {
        valueSets[specificValueSet.oid][specificValueSet.version] = [];
      }
      specificValueSet.concepts.forEach((concept) => {
        valueSets[specificValueSet.oid][specificValueSet.version]
          .push({
            code: concept.code,
            system: concept.code_system_name,
            version: specificValueSet.version,
          });
      });
    });
    return valueSets;
  }

  // Converts the given time to the correct format using momentJS
  static getConvertedTime(timeValue) {
    return moment.utc(timeValue, 'YYYYMDDHHmm').toDate();
  }

  // Converts the given time to the correct format using momentJS, shifted to the end of its yearlong period
  static getConvertedTimeEndOfYear(timeValue) {
    return moment.utc(timeValue, 'YYYYMDDHHmm').add(1, 'years').subtract(1, 'seconds').toDate();
  }

  static isValueZero(value, populationSet) {
    if (value in populationSet && populationSet[value] === 0) {
      return true;
    }
    return false;
  }

  // Returns a JSON function to add to the ELM before ELM JSON is used to calculate results
  // This ELM template was generated by the CQL-to-ELM Translation Service
  static generateELMJSONFunction(functionName, parameter) {
    const elmFunction = {
      name: `EcqmeFunction_${functionName}`,
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
