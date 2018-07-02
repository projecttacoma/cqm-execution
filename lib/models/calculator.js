/**
 * The CQL calculator. This calls the cql-execution framework and formats the results as neccesary.
 */
const _ = require('lodash');
const CqmModels = require('cqm-models');
const cql = require('cqm-models').CQL;
const ResultsHelpers = require('../helpers/results_helpers');
const CalculatorHelpers = require('../helpers/calculator_helpers');

module.exports = class Calculator {
  /**
   * Generate calculation results for patients against a CQL measure.
   *
   * @param {Measure} measure - The measure population to calculate on.
   * @param {PatientSource} patientSource - The patientSource to run calculations on.
   * @param {Hash} valueSetsByOid - all ValueSets relevant to the measure.
   * @param {Hash} options - contains options for measure calculation.
   */
  static calculate(measure, patientSource, valueSetsByOid, options = {}) {
    // We store both the calculation result and the calculation code based on keys derived from the arguments
    const resultsByPatient = {};

    // Grab start and end of Measurement Period
    let start;
    let end;
    // Override default measure_period with effective_date if available
    if (options && options.effective_date != null) {
      start = CalculatorHelpers.getConvertedTime(options.effective_date);
      if (options.effective_date_end != null) {
        end = CalculatorHelpers.getConvertedTime(options.effective_date_end);
      } else {
        end = CalculatorHelpers.getConvertedTimeEndOfYear(options.effective_date);
      }
    } else {
      start = CalculatorHelpers.getConvertedTime(measure.measure_period.low.value);
      end = CalculatorHelpers.getConvertedTime(measure.measure_period.high.value);
    }

    const startCql = cql.DateTime.fromDate(start, 0); // No timezone offset for start
    const endCql = cql.DateTime.fromDate(end, 0); // No timezone offset for stop

    // Construct CQL params
    const params = { 'Measurement Period': new cql.Interval(startCql, endCql) };

    // Create the execution DateTime that we pass into the engine
    const executionDateTime = cql.DateTime.fromDate(new Date(), '0');

    // Grab ELM JSON from measure, use clone so that the function added from observations does not get added over and over again
    // Set all value set versions to 'undefined' so the execution engine does not grab the specified version in the ELM
    const elm = CalculatorHelpers.setValueSetVersionsToUndefined(_.clone(measure.elm));

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
    let generatedELMJSON;
    if (observations) {
      observations.forEach((obs) => {
        generatedELMJSON = CalculatorHelpers.generateELMJSONFunction(obs.function_name, obs.parameter);
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

    // Grab the correct version of value sets to pass into the exectuion engine.
    const measureValueSets = CalculatorHelpers.valueSetsForCodeService(valueSetsByOid, measure.value_set_oids);

    // Calculate results for each CQL statement
    const resultsRaw = Calculator.executeEngine(
      elm,
      patientSource,
      measureValueSets,
      measure.main_cql_library,
      mainLibraryVersion,
      executionDateTime,
      params
    );

    Object.keys(resultsRaw.patientResults).forEach((patientId) => {
      let populationResults;
      let episodeResults;
      let populationRelevance;

      // Parse CQL statement results into population values
      measure.populations.forEach((population, populationIndex) => {
        [populationResults, episodeResults] = Array.from(CalculatorHelpers.createPopulationValues(
          measure,
          population,
          resultsRaw,
          patientId,
          observationDefs,
          populationIndex
        ));
        if (populationResults) {
          const result = CqmModels.IndividualResult();
          result.set(populationResults);
          if (episodeResults != null) {
            // In episode of care based measures, episodeResults contains the population results
            // for EACH episode.
            result.episode_results = episodeResults;
            if (Object.keys(episodeResults).length > 0) {
              /* In episode of care based measures, episode_results contains the population results
               * for EACH episode, so we need to build population_relevance based on a combonation
               * of the episode_results. IE: If DENEX is irrelevant for one episode but relevant for
               * another, the logic view should not highlight it as irrelevant
               */
              populationRelevance = ResultsHelpers.populationRelevanceForAllEpisodes(episodeResults);
            } else {
              // Use the patient based relevance if there are no episodes. This will properly set IPP or STRAT to true.
              populationRelevance = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
            }
          } else {
            // Calculate relevance for patient based measure
            populationRelevance = ResultsHelpers.buildPopulationRelevanceMap(populationResults);
          }

          // Build statement relevance mappings
          const statementRelevance = ResultsHelpers.buildStatementRelevanceMap(
            populationRelevance,
            measure,
            population,
            populationIndex
          );

          result.population_relevance = populationRelevance;
          result.statement_relevance = statementRelevance;

          result.set(ResultsHelpers.buildStatementAndClauseResults(measure, resultsRaw.localIdPatientResultsMap[patientId], statementRelevance, !!options.doPretty));

          // Populate result with info
          result.patient = patientId;
          result.measure = measure._id;
          result.state = 'complete';

          // Add result of population set, hashed by population set idc
          if (!resultsByPatient[patientId]) {
            resultsByPatient[patientId] = {};
          }
          resultsByPatient[patientId][population.id] = result;
        }
      });
    });
    return resultsByPatient;
  }

  /**
   * Call into the CQL execution engine for raw results.
   */
  static executeEngine(elm, patientSource, valueSets, libraryName, version, executionDateTime, parameters = {}) {
    let lib;
    let rep;
    if (Array.isArray(elm)) {
      if (elm.length > 1) {
        rep = new cql.Repository(elm);
        lib = rep.resolve(libraryName, version);
      } else {
        lib = new cql.Library(elm[0]);
      }
    } else {
      lib = new cql.Library(elm);
    }
    const codeService = new cql.CodeService(valueSets);
    const executor = new cql.Executor(lib, codeService, parameters);
    return executor.exec(patientSource, executionDateTime);
  }
};
