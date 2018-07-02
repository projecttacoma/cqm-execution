# cqm-execution

This repository contains an NPM module for calculating ECQMs (electronic clinical quality measures) written in CQL (clinical quality language), using the Project Tacoma CQM models (https://github.com/projecttacoma/cqm-models).

## Installation

### npm
```
npm install cqm-execution
```

### yarn
```
yarn add cqm-execution
```

## Usage
Example usage:
```
const Mongoose = require('mongoose');
const Calculator = require('cqm-execution').Calculator;
const PatientSource = require('cqm-execution').PatientSource;

// Example fixture loader (useful for this example).
const fs = require('fs');
getJSONFixture(fixturePath) {
  var contents = fs.readFileSync('spec/fixtures/json/' + fixturePath);
  return JSON.parse(contents);
}

// Load value sets from test fixtures.
const valueSetsByOid = getJSONFixture('measures/CMS107v6/value_sets.json');

// Load a measure from test fixtures.
const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');

// Load in an example patient from test fixtures, initialize into the cqm-models schemas, and create a patient source from it.
const patients = [];
patients.push(getJSONFixture('patients/CMS107v6/IPPFail_LOS=121Days.json'));
const QDMPatient = Mongoose.model('QDMPatient', QDMPatientSchema);
const qdmPatients = patients.map(patient => new QDMPatient(patient));
const qdmPatientsSource = new PatientSource(qdmPatients);

// Example options; includes directive to produce pretty statement results.
options = { doPretty: true };

// Calculate results.
const calculationResults = Calculator.calculate(measure, qdmPatientsSource, valueSetsByOid, options);
```
