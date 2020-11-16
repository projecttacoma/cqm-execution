const moment = require("moment");

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
  static createPopulationValues(
    measure,
    populationSet,
    patientResults,
    observationDefs
  ) {
    let populationResults = {};
    let episodeResults = null;

    // patient based measure
    if (measure.calculation_method !== "EPISODE_OF_CARE") {
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
      if (populationSet.populations) {
        populationSet.populations.codes.forEach((popCode) => {
          populationResults[popCode] = 0;
          if (populationSet.observations && populationSet.observations.length > 0) {
            populationResults.observation_values = [];
          }
        });
      }

      // count up all population results for a patient level count
      Object.keys(episodeResults).forEach((e) => {
        const episodeResult = episodeResults[e];
        Object.keys(episodeResult).forEach((popCode) => {
          const popResult = episodeResult[popCode];
          if (popCode === "observation_values") {
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
    if (
      populationResultsHandled.STRAT != null
      && this.isValueZero("STRAT", populationResults)
    ) {
      // Set all values to 0
      Object.keys(populationResults).forEach((key) => {
        if (key === "observation_values") {
          populationResultsHandled.observation_values = [];
        } else {
          populationResultsHandled[key] = 0;
        }
      });
    } else if (this.isValueZero("IPP", populationResults)) {
      Object.keys(populationResults).forEach((key) => {
        if (key !== "STRAT") {
          if (key === "observation_values") {
            populationResultsHandled.observation_values = [];
          } else {
            populationResultsHandled[key] = 0;
          }
        }
      });
    } else if (
      this.isValueZero("DENOM", populationResults)
      || this.isValueZero("MSRPOPL", populationResults)
    ) {
      if ("DENEX" in populationResults) {
        populationResultsHandled.DENEX = 0;
      }
      if ("DENEXCEP" in populationResults) {
        populationResultsHandled.DENEXCEP = 0;
      }
      if ("NUMER" in populationResults) {
        populationResultsHandled.NUMER = 0;
      }
      if ("NUMEX" in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
      if ("MSRPOPLEX" in populationResults) {
        populationResultsHandled.MSRPOPLEX = 0;
      }
      if ("observation_values" in populationResults) {
        populationResultsHandled.observation_values = [];
      }
      // Can not be in the numerator if the same or more are excluded from the denominator
    } else if (
      populationResults.DENEX != null
      && !this.isValueZero("DENEX", populationResults)
      && populationResults.DENEX >= populationResults.DENOM
    ) {
      if ("NUMER" in populationResults) {
        populationResultsHandled.NUMER = 0;
      }
      if ("NUMEX" in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
      if ("DENEXCEP" in populationResults) {
        populationResultsHandled.DENEXCEP = 0;
      }
    } else if (
      populationResults.MSRPOPLEX != null
      && !this.isValueZero("MSRPOPLEX", populationResults)
    ) {
      if ("observation_values" in populationResults) {
        populationResultsHandled.observation_values = [];
      }
    } else if (this.isValueZero("NUMER", populationResults)) {
      if ("NUMEX" in populationResults) {
        populationResultsHandled.NUMEX = 0;
      }
    } else if (!this.isValueZero("NUMER", populationResults)) {
      if ("DENEXCEP" in populationResults) {
        populationResultsHandled.DENEXCEP = 0;
      }
    }
    return populationResultsHandled;
  }

  /**
   * Create patient population values (aka results) for all populations in the population set using the results from the
   * calculator.
   * @param {PopulationSet} populationSet - The population set we are getting the values for.
   * @param {Object} patientResults - The raw results object for a patient from the calculation engine.
   * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
   * @returns {Object} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
   *   their key is 'value' and value is an array of results.
   */
  static createPatientPopulationValues(
    populationSet,
    patientResults,
    observationDefs
  ) {
    const populationResults = {};

    // Loop over all population codes ("IPP", "DENOM", etc.)
    if (populationSet.populations) {
      populationSet.populations.codes.forEach((popCode) => {
        const cqlPopulation = populationSet.populations[popCode].statement_name;
        // Is there a patient result for this population? and does this populationCriteria contain the population
        // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
        // Grab CQL result value and adjust for ECQME
        const value = patientResults[cqlPopulation];
        if (Array.isArray(value) && value.length > 0) {
          populationResults[popCode] = value.length;
        } else if (typeof value === "boolean" && value) {
          populationResults[popCode] = 1;
        } else {
          populationResults[popCode] = 0;
        }
      });
    }
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
        const obsResults = patientResults != null ? patientResults[obDef] : undefined;

        if (obsResults) {
          // obsResults can be a single value not wrapoed into an array
          const obsList = Array.isArray(obsResults) ? obsResults : Array.of(obsResults);
          obsList.forEach((obsResult) => {
            // Add the single result value to the values array on the results of
            // this calculation (allowing for more than one possible observation).
            if (
              obsResult != null
                ? Object.prototype.hasOwnProperty.call(obsResult, "value")
                : undefined
            ) {
              // If result is a Cql.Quantity type, add its value
              populationResults.observation_values.push(
                obsResult.observation.value
              );
            } else {
              // In all other cases, add result
              populationResults.observation_values.push(obsResult.observation);
            }
          });
        }
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
  static createEpisodePopulationValues(
    populationSet,
    patientResults,
    observationDefs
  ) {
    const episodeResults = {};

    if (populationSet.populations) {
      for (const popCode in populationSet.populations.codes) {
        let newEpisode;
        const cqlPopulation = populationSet.populations[popCode];
        if (cqlPopulation) {
          // Is there a patient result for this population? and does this populationCriteria contain the population
          // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
          // Grab CQL result value and store for each episode found
          const dataElements = patientResults[cqlPopulation.statement_name];
          if (Array.isArray(dataElements)) {
            dataElements.forEach((dataElement) => {
              if (dataElement.id != null) {
                // if an episode has already been created set the result for the population to 1
                if (episodeResults[dataElement.id]) {
                  episodeResults[dataElement.id][popCode] = 1;
                  // else create a new episode using the list of all popcodes for the population
                } else {
                  newEpisode = {};
                  for (const pc in populationSet.populations.codes) {
                    newEpisode[pc] = 0;
                  }

                  newEpisode[popCode] = 1;
                  episodeResults[dataElement.id] = newEpisode;
                }
              }
            });
          }
        }
      }
    }

    if ((observationDefs != null ? observationDefs.length : undefined) > 0) {
      // Handle observations using the names of the define statements that
      // were added to the ELM to call the observation functions.
      observationDefs.forEach((obDef) => {
        // Observations only have one result, based on how the HQMF is
        // structured (note the single 'value' section in the
        // measureObservationDefinition clause).
        const obsResults = patientResults != null ? patientResults[obDef] : undefined;

        if (obsResults) {
          const obsList = Array.isArray(obsResults) ? obsResults : Array.of(obsResults);

          obsList.forEach((obsResult) => {
            let resultValue = null;
            if (!obsResult.episode) {
              // Warning: Observation's episode is undefined. Perhaps not an EPOSIDE_OF_CARE measure.
              return;
            }
            const episodeId = obsResult.episode.id;
            // Add the single result value to the values array on the results of
            // this calculation (allowing for more than one possible observation).
            if (
              obsResult != null
                ? Object.prototype.hasOwnProperty.call(obsResult, "value")
                : undefined
            ) {
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
              for (const pc in populationSet.populations.codes) {
                newEpisode[pc] = 0;
              }
              newEpisode.observation_values = [resultValue];
              episodeResults[episodeId] = newEpisode;
            }
          });
        }
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

  // Format FHIR ValueSets for use by the execution engine
  static valueSetsForCodeService(valueSetsArray) {
    const valueSets = {};
    valueSetsArray.forEach((valueSet) => {
      if (!valueSet.compose || !valueSet.compose.include) {
        return;
      }
      valueSet.compose.include.forEach((include) => {
        if (!include.concept) {
          return;
        }
        let version = include.version;
        if (version === "N/A") {
          version = "";
        }
        include.concept.forEach((concept) => {
          const id = (valueSet.url || {}).value || valueSet.id;
          if (!valueSets[id]) {
            valueSets[id] = {};
          }
          if (!valueSets[id][version]) {
            valueSets[id][version] = [];
          }
          valueSets[id][version].push({
            code: concept.code.value,
            system: CalculatorHelpers.systemUriByName(include.system.value),
            version,
          });
        });
      });
    });
    return valueSets;
  }
  
  // Create Date from UTC string date and time using momentJS
  static parseTimeStringAsUTC(timeValue) {
    return moment.utc(timeValue, "YYYYMDDHHmm").toDate();
  }

  // Create Date from UTC string date and time using momentJS, shifting to 11:59:59 of the given year
  static parseTimeStringAsUTCConvertingToEndOfYear(timeValue) {
    return moment
      .utc(timeValue, "YYYYMDDHHmm")
      .add(1, "years")
      .subtract(1, "seconds")
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
      context: "Patient",
      accessLevel: "Public",
      expression: {
        type: "Query",
        source: [
          {
            alias: "MP",
            expression: {
              name: parameter,
              type: "ExpressionRef",
            },
          },
        ],
        relationship: [],
        return: {
          distinct: false,
          expression: {
            type: "Tuple",
            element: [
              {
                name: "episode",
                value: {
                  name: "MP",
                  type: "AliasRef",
                },
              },
              {
                name: "observation",
                value: {
                  name: functionName,
                  type: "FunctionRef",
                  operand: [
                    {
                      type: "As",
                      operand: {
                        name: "MP",
                        type: "AliasRef",
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

  static map;
  static systemUriByName(systemName) {
    if(this.map === undefined) {
      /* eslint dot-notation:0 */
      this.map = {};
      this.map['medication-statement-status'] = 'http://hl7.org/fhir/CodeSystem/medication-statement-status';
      this.map['medicationrequest-intent'] = 'http://hl7.org/fhir/CodeSystem/medicationrequest-intent';
      this.map['medicationrequest-status'] = 'http://hl7.org/fhir/CodeSystem/medicationrequest-status';
      this.map['discharge-disposition'] = 'http://terminology.hl7.org/CodeSystem/discharge-disposition';
      this.map['event-status'] = 'http://hl7.org/fhir/event-status';
      this.map['condition-ver-status'] = 'http://terminology.hl7.org/CodeSystem/condition-ver-status';
      this.map['condition-clinical'] = 'http://terminology.hl7.org/CodeSystem/condition-clinical';
      this.map['allergyintolerance-clinical'] = 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical';
      this.map['allergyintolerance-verification'] = 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification';
      this.map['ConditionCategoryCodes'] = 'http://terminology.hl7.org/CodeSystem/condition-category';
      this.map['USCoreConditionCategoryExtensionCodes'] = 'http://hl7.org/fhir/us/core/CodeSystem/condition-category';
      this.map['request-status'] = 'http://hl7.org/fhir/request-status';
      this.map['request-intent'] = 'http://hl7.org/fhir/request-intent';
      this.map['admit-source'] = 'http://terminology.hl7.org/CodeSystem/admit-source';
      this.map['ActCode'] = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
      this.map['ReasonMedicationGivenCodes'] = 'http://terminology.hl7.org/CodeSystem/reason-medication-given';
      this.map['MedicationRequestCategoryCodes'] = 'http://terminology.hl7.org/CodeSystem/medicationrequest-category';
      this.map['GTSAbbreviation'] = 'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation';
      this.map['MedicationRequest Status Reason Codes'] = 'http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason';
      this.map['DiagnosticReportStatus'] = 'http://hl7.org/fhir/diagnostic-report-status';
      this.map['ObservationCategoryCodes'] = 'http://terminology.hl7.org/CodeSystem/observation-category';
      this.map['LOINCCodes'] = 'http://loinc.org';
      this.map['LOINC'] = 'http://loinc.org';
      this.map['SNOMEDCT'] = 'http://snomed.info/sct';
      this.map['SNOMED CT'] = 'http://snomed.info/sct';
      this.map['SNOMEDCT:2017-09'] = 'http://snomed.info/sct';
      this.map['CPT'] = 'http://www.ama-assn.org/go/cpt';
      this.map['SOP'] = 'http://www.nlm.nih.gov/research/umls/sop';
      this.map['ICD9CM'] = 'http://hl7.org/fhir/sid/icd-9-cm';
      this.map['ICD10PCS'] = 'http://www.icd10data.com/icd10pcs';
      this.map['ICD10CM'] = 'http://hl7.org/fhir/sid/icd-10-cm';
      this.map['ActMood'] = 'http://hl7.org/fhir/v3/ActMood';
      this.map['ActPriority'] = 'http://hl7.org/fhir/v3/ActPriority';
      this.map['ActReason'] = 'http://hl7.org/fhir/v3/ActReason';
      this.map['ActRelationshipType'] = 'http://hl7.org/fhir/v3/ActRelationshipType';
      this.map['ActStatus'] = 'http://hl7.org/fhir/v3/ActStatus';
      this.map['AddressUse'] = 'http://hl7.org/fhir/v3/AddressUse';
      this.map['AdministrativeGender'] = 'http://hl7.org/fhir/v3/AdministrativeGender';
      this.map['AdministrativeSex'] = 'http://hl7.org/fhir/v2/0001';
      this.map['CDT'] = 'http://www.nlm.nih.gov/research/umls/cdt';
      this.map['CVX'] = 'http://hl7.org/fhir/sid/cvx';
      this.map['Confidentiality'] = 'http://hl7.org/fhir/v3/Confidentiality';
      this.map['DischargeDisposition'] = 'http://hl7.org/fhir/v2/0112';
      this.map['EntityNamePartQualifier'] = 'http://hl7.org/fhir/v3/EntityNamePartQualifier';
      this.map['EntityNameUse'] = 'http://hl7.org/fhir/v3/EntityNameUse';
      this.map['LanguageAbilityMode'] = 'http://hl7.org/fhir/v3/LanguageAbilityMode';
      this.map['LanguageAbilityProficiency'] = 'http://hl7.org/fhir/v3/LanguageAbilityProficiency';
      this.map['LivingArrangement'] = 'http://hl7.org/fhir/v3/LivingArrangement';
      this.map['MaritalStatus'] = 'http://hl7.org/fhir/v3/MaritalStatus';
      this.map['MED-RT'] = 'http://www.nlm.nih.gov/research/umls/MED-RT';
      this.map['NCI'] = 'http://ncimeta.nci.nih.gov';
      this.map['NDFRT'] = 'http://hl7.org/fhir/ndfrt';
      this.map['NUCCPT'] = 'http://nucc.org/provider-taxonomy';
      this.map['NullFlavor'] = 'http://hl7.org/fhir/v3/NullFlavor';
      this.map['ObservationInterpretation'] = 'http://hl7.org/fhir/v3/ObservationInterpretation';
      this.map['ObservationValue'] = 'http://hl7.org/fhir/v3/ObservationValue';
      this.map['ParticipationFunction'] = 'http://hl7.org/fhir/v3/ParticipationFunction';
      this.map['ParticipationMode'] = 'http://hl7.org/fhir/v3/ParticipationMode';
      this.map['ParticipationType'] = 'http://hl7.org/fhir/v3/ParticipationType';
      this.map['RXNORM'] = 'http://www.nlm.nih.gov/research/umls/rxnorm';
      this.map['ReligiousAffiliation'] = 'http://hl7.org/fhir/v3/ReligiousAffiliation';
      this.map['RoleClass'] = 'http://hl7.org/fhir/v3/RoleClass';
      this.map['RoleCode'] = 'http://hl7.org/fhir/v3/RoleCode';
      this.map['RoleStatus'] = 'http://hl7.org/fhir/v3/RoleStatus';
      this.map['SOP'] = 'http://www.nlm.nih.gov/research/umls/sop';
      this.map['UCUM'] = 'http://unitsofmeasure.org';
      this.map['UMLS'] = 'http://www.nlm.nih.gov/research/umls';
      this.map['UNII'] = 'http://fdasis.nlm.nih.gov';
      this.map['mediaType'] = 'http://hl7.org/fhir/v3/MediaType';
    }
    return this.map[systemName] || systemName;
  }
};


