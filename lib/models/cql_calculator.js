/**
 * The CQL calculator. This calls the CQL4Browsers engine then prepares the results for consumption by the rest of
 * Bonnie.
 */

const _ = require('lodash');
const moment = require('moment');
const CqmModels = require('cqm-models');
const Cql = require('cqm-models').CQL;
const Measure = require('cqm-models').Measure();

module.exports = class CQLCalculator {
  constructor() {
    this.calculator = {};
    this.calculatorLoaded = {};
    this.resultsCache = {};
    this.valueSetsByMongoidCached = {};
  }

  // Key for storing calculators on a measure
  static calculationKey(measure) { return `${measure.id}`; }

  // Key for storing results for a patient / population calculation
  // we use the mongo ID for the patient portion
  cacheKey(measure, patient) { return `${this.calculationKey(measure)}/${patient.id()}`; }

  clearResult(measure, patient) {
    return delete this.resultsCache[this.cacheKey(measure, patient)];
  }

  /**
   * Generate a calculation result for a population / patient pair; this always returns a result immediately,
   * but may return a blank result object if there was a problem. Currently we do not do CQL calculations in
   * deferred manner like we did for QDM calcuations.
   * @param {Population} population - The population set to calculate on.
   * @param {Patient} patientSource - The patientSource to run calculations on.
   */
  calculate(measure, patientSource, valueSetsByMongoid) {
    // We store both the calculation result and the calcuation code based on keys derived from the arguments
    let generatedELMJSON;

    const resultsByPatient = {};

    this.valueSetsByMongoid = valueSetsByMongoid;

    patientSource.reset();

    // try {

    // Grab start and end of Measurement Period
    const start =
        this.constructor.getConvertedTime(measure.get('measure_period').low.value);
    const end =
        this.constructor.getConvertedTime(measure.get('measure_period').high.value);
    const startCql = Cql.DateTime.fromDate(start, 0); // No timezone offset for start
    const endCql = Cql.DateTime.fromDate(end, 0); // No timezone offset for stop

    // Construct CQL params
    const params = { 'Measurement Period': new Cql.Interval(startCql, endCql) };

    // Grab ELM JSON from measure, use clone so that the function added from observations does not get added over and over again
    const elm = _.clone(measure.get('elm'));

    // Find the main library (the library that is the "measure") and
    // grab the version to pass into the execution engine
    let mainLibraryVersion = '';
    let mainLibraryIndex = 0;
    for (let index = 0; index < elm.length; index += 1) {
      const elmLibrary = elm[index];
      if (elmLibrary.library.identifier
        .id === measure.get('main_cql_library')) {
        mainLibraryVersion = elmLibrary.library.identifier.version;
        mainLibraryIndex = index;
      }
    }

    // TODO: We still haven't tested out observations-related measures because that wasn't in any
    //       of our current fixtures
    const observations = measure.get('observations');
    const observationDefs = [];
    if (observations) {
      observations.forEach((obs) => {
        generatedELMJSON = this.generateELMJSONFunction(obs.function_name, obs.parameter);
        // Save the name of the generated define statement, so we can check
        // its result later in the CQL calculation process. These added
        // define statements are called 'BonnieFunction_' followed by the
        // name of the function - see the 'generateELMJSONFunction' function.
        observationDefs.push(`BonnieFunction_${obs.function_name}`);
        // Check to see if the gneratedELMJSON function is already in the definitions
        // Added a check to support old ELM representation and new Array representation.
        if (Array.isArray(elm) &&
            ((elm[mainLibraryIndex].library
              .statements.def.filter(def => def.name === generatedELMJSON.name)).length === 0)) {
          elm[mainLibraryIndex].library.statements.def.push(generatedELMJSON);
        } else if (!Array.isArray(elm) &&
            ((elm.library
              .statements.def.filter(def => def.name === generatedELMJSON.name)).length === 0)) {
          elm.library.statements.def.push(generatedELMJSON);
        }
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

    // Grab the correct version of value sets to pass into the exectuion engine.
    const measureValueSets =
        this.valueSetsForCodeService(
          measure.get('value_sets'),
          measure.get('hqmf_set_id'),
        );

    // Calculate results for each CQL statement
    const resultsRaw =
        this.constructor.executeEngine(
          elm, patientSource, measureValueSets,
          measure.get('main_cql_library'), mainLibraryVersion, params,
        );

    // TODO: Aggregate result should be an AggregateResult object once the model is built
    let aggregate = CqmModels.IndividualResult();

    Object.keys(resultsRaw.patientResults).forEach((patientId) => {
      const result = CqmModels.IndividualResult();

      // Parse CQL statement results into population values
      const [populationResults, episodeResults] =
            Array.from(this.createPopulationValues(
              measure, resultsRaw,
              patientId, observationDefs
            ));
      // All of the following until the final result set patient_id may no longer be needed.
      if (populationResults != null) {
        result.set(populationResults);
        if (episodeResults != null) {
          // In episode of care based measures, episodeResults contains the population results
          // for EACH episode.
          result.set({ episode_results: episodeResults });
        }
        result.patient = patientId;
        result.measure = measure._id;
        resultsByPatient[patientId] = result;

        aggregate = this.constructor.aggregateIndividualResults(aggregate, result);
      }
    });
    // } catch (error) {
    //   Error(error);
    // }

    return [resultsByPatient, aggregate];
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
  createPopulationValues(measure, results, patientId, observationDefs) {
    let populationResults = {};
    let episodeResults = null;
    let population;
    // Get population
    if (measure.get('population_ids').stratification) {
      population = _.find(
        measure.get('populations'),
        ['stratification', measure.get('population_ids').stratification]
      );
    } else {
      population = _.find(
        measure.get('populations'),
        p => !p.stratification
      );
    }

    // patient based measure
    if (!measure.get('episode_of_care')) {
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
    // Setting values of populations if the correct populations are not set based on the following logic guidelines
    // Initial Population (IPP): The set of patients or episodes of care to be evaluated by the measure.
    // Denominator (DENOM): A subset of the IPP.
    // Denominator Exclusions (DENEX): A subset of the Denominator that should not be considered for inclusion in the Numerator.
    // Denominator Exceptions (DEXCEP): A subset of the Denominator. Only those members of the Denominator that are considered
    // for Numerator membership and are not included are considered for membership in the Denominator Exceptions.
    // Numerator (NUMER): A subset of the Denominator. The Numerator criteria are the processes or outcomes expected for each patient,
    // procedure, or other unit of measurement defined in the Denominator.
    // Numerator Exclusions (NUMEX): A subset of the Numerator that should not be considered for calculation.
    const populationResultsHandled = populationResults;
    if ((populationResultsHandled.STRAT != null) &&
        this.constructor.isValueZero('STRAT', populationResults)) { // Set all values to 0
      Object.keys(populationResults).forEach((key) => {
        populationResultsHandled[key] = 0;
      });
    } else if (this.constructor.isValueZero('IPP', populationResults)) {
      Object.keys(populationResults).forEach((key) => {
        if (key !== 'STRAT') {
          populationResultsHandled[key] = 0;
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
    // TODO: Temporarily disable the removal of OBSERVs when a member of MSRPOPLEX as to not change actual result values uncomment for 2.1 release
    // else if (populationResults["MSRPOPLEX"]? && !@isValueZero('MSRPOPLEX', populationResults))
    //  if 'values' of populationResults
    //    populationResults['values'] = []
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
   * @param {Patient} patient - The patient we are getting results for.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {object} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results.
   */
  createPatientPopulationValues(measure, population, results, patientId, observationDefs) {
    const populationResults = {};
    // Grab the mapping between populations and CQL statements
    const cqlMap = measure.get('populations_cql_map');
    // Grab the correct expected for this population
    // const populationIndex = population.get('index');
    // const measureId = measure.get('hqmf_set_id');
    // const expected = patient.get('expected_values')
    //  .findWhere({ measure_id: measureId, population_index: populationIndex });
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
          // Grab CQL result value and adjust for Bonnie
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
    const cqlMap = measure.get('populations_cql_map');
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

    console.log(episodeResults);

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
    return _.findIndex(measure.get('populations'), p => p === population);
  }

  // Format ValueSets for use by CQL4Browsers
  valueSetsForCodeService(valueSetMongoids, hqmfSetId) {
    // Cache this refactoring so it only happens once per user rather than once per measure population
    if (!this.valueSetsByMongoidCached[hqmfSetId]) {
      const valueSets = {};
      valueSetMongoids.forEach((mongoid) => {
        const specificValueSet = this.valueSetsByMongoid[mongoid];
        if (!specificValueSet.concepts) {
          return;
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

      this.valueSetsByMongoidCached[hqmfSetId] = valueSets;
    }
    return this.valueSetsByMongoidCached[hqmfSetId];
  }

  static aggregateIndividualResults(aggregate, individualResult) {
    // TODO: Finish this to expand further than just population values
    if (individualResult.get('STRAT')) {
      aggregate.set({ STRAT: aggregate.get('STRAT') ? aggregate.get('STRAT') + 1 : 1 });
    }
    if (individualResult.get('IPP')) {
      aggregate.set({ IPP: aggregate.get('IPP') ? aggregate.get('IPP') + 1 : 1 });
    }
    if (individualResult.get('DENOM')) {
      aggregate.set({ DENOM: aggregate.get('DENOM') ? aggregate.get('DENOM') + 1 : 1 });
    }
    if (individualResult.get('NUMER')) {
      aggregate.set({ NUMER: aggregate.get('NUMER') ? aggregate.get('NUMER') + 1 : 1 });
    }
    if (individualResult.get('NUMEX')) {
      aggregate.set({ NUMEX: aggregate.get('NUMEX') ? aggregate.get('NUMEX') + 1 : 1 });
    }
    if (individualResult.get('DENEX')) {
      aggregate.set({ DENEX: aggregate.get('DENEX') ? aggregate.get('DENEX') + 1 : 1 });
    }
    if (individualResult.get('DENEXCEP')) {
      aggregate.set({ DENEXCEP: aggregate.get('DENEXCEP') ? aggregate.get('DENEXCEP') + 1 : 1 });
    }
    if (individualResult.get('MSRPOPL')) {
      aggregate.set({ MSRPOPL: aggregate.get('MSRPOPL') ? aggregate.get('MSRPOPL') + 1 : 1 });
    }
    if (individualResult.get('OBSERV')) {
      aggregate.set({ OBSERV: aggregate.get('OBSERV') ? aggregate.get('OBSERV') + 1 : 1 });
    }
    if (individualResult.get('MSRPOPLEX')) {
      aggregate.set({ MSRPOPLEX: aggregate.get('MSRPOPLEX') ? aggregate.get('MSRPOPLEX') + 1 : 1 });
    }
    return aggregate;
  }

  // Converts the given time to the correct format using momentJS
  static getConvertedTime(timeValue) {
    return moment.utc(timeValue, 'YYYYMDDHHmm').toDate();
  }

  static isValueZero(value, populationSet) {
    if (value in populationSet && populationSet[value] === 0) {
      return true;
    }
    return false;
  }

  // TODO: change name from 'BonnieFunction' to 'EcqmeFunction', make sure things on Bonnie's end change accordingly
  // Returns a JSON function to add to the ELM before ELM JSON is used to calculate results
  // This ELM template was generated by the CQL-to-ELM Translation Service
  static generateELMJSONFunction(functionName, parameter) {
    const elmFunction = {
      name: `BonnieFunction_${functionName}`,
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
