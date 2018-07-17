/**
 * The CQL calculator. This calls the cql-execution framework and formats the results as neccesary.
 */
const _ = require('lodash');
const Mongoose = require('mongoose');
const CqmModels = require('cqm-models');
const cql = require('cqm-models').CQL;
const QDMPatientSchema = require('cqm-models').PatientSchema;
const ResultsHelpers = require('../helpers/results_helpers');
const CalculatorHelpers = require('../helpers/calculator_helpers');
const PatientSource = require('./patient_source');

module.exports = class Calculator {
  /**
   * Generate calculation results for patients against a CQL measure.
   *
   * @param {Measure} measure - The measure population to calculate on.
   * @param {Array} patients - The array of QDM patients to run calcs on.
   * @param {Hash} valueSetsByOid - all ValueSets relevant to the measure.
   * @param {Hash} options - contains options for measure calculation.
   * @returns {patientId, results} results - mapping from patient to calculation results for each patient.
   */
  static calculate(measure, patients, valueSetsByOid, options = {}) {
    // We store both the calculation result and the calculation code based on keys derived from the arguments
    const resultsByPatient = {};

    const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
    const qdmPatients = patients.map(patient => new QDMPatient(patient));
    const patientSource = new PatientSource(qdmPatients);

    // Grab start and end of Measurement Period
    let start;
    let end;
    // Override default measure_period with effective_date if available
    if (options && options.effective_date != null) {
      start = CalculatorHelpers.parseTimeStringAsUTC(options.effective_date);
      if (options.effective_date_end != null) {
        end = CalculatorHelpers.parseTimeStringAsUTC(options.effective_date_end);
      } else {
        end = CalculatorHelpers.parseTimeStringAsUTCConvertingToEndOfYear(options.effective_date);
      }
    } else {
      start = CalculatorHelpers.parseTimeStringAsUTC(measure.measure_period.low.value);
      end = CalculatorHelpers.parseTimeStringAsUTC(measure.measure_period.high.value);
    }

    const startCql = cql.DateTime.fromDate(start, 0); // No timezone offset for start
    const endCql = cql.DateTime.fromDate(end, 0); // No timezone offset for stop

    // Construct CQL params
    const params = { 'Measurement Period': new cql.Interval(startCql, endCql) };

    // Grab execution date time from options
    let executionDateOption;
    // Override default measure_period with effective_date if available else default to new Date()
    if (options && options.execution_date != null) {
      executionDateOption = CalculatorHelpers.parseTimeStringAsUTC(options.effective_date);
    } else {
      executionDateOption = new Date();
    }

    // Create the execution DateTime that we pass into the engine
    const executionDateTime = cql.DateTime.fromDate(executionDateOption, '0');

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
        // define statements are called 'obs_func_' followed by the
        // name of the function - see the 'generateELMJSONFunction' function.
        observationDefs.push(`obs_func_${obs.function_name}`);
        // Add the generated elm representing the observation function into the elm
        elm[mainLibraryIndex].library.statements.def.push(generatedELMJSON);
      });
    }

    // Grab the correct version of value sets to pass into the execution engine.
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

          const statementRelevance = ResultsHelpers.buildStatementRelevanceMap(
            populationRelevance,
            measure,
            population,
            populationIndex
          );

          result.extendedData.population_relevance = populationRelevance;
          result.extendedData.statement_relevance = statementRelevance;

          result.set(ResultsHelpers.buildStatementAndClauseResults(measure, resultsRaw.localIdPatientResultsMap[patientId], statementRelevance, !!options.doPretty));

          // Populate result with info
          result.patient = patientId;
          result.measure = measure._id;
          result.state = 'complete';

          // Add result of population set, hashed by population set id
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
