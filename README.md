[![Build Status](https://travis-ci.com/projecttacoma/cqm-execution.svg?branch=master)](https://travis-ci.com/projecttacoma/cqm-execution)
[![codecov](https://codecov.io/gh/projecttacoma/cqm-execution/branch/master/graph/badge.svg)](https://codecov.io/gh/projecttacoma/cqm-execution)
![NPM](https://img.shields.io/npm/v/cqm-execution.svg)

# cqm-execution

This repository contains an npm module for calculating eCQMs (electronic clinical quality measures) written in CQL (clinical quality language), using the Project Tacoma CQM models (https://github.com/projecttacoma/cqm-models).

## Installation

### npm
```
npm install cqm-execution
```

### yarn
```
yarn add cqm-execution
```

## Running the tests 

```
yarn test
```


## Usage
Example usage:
```javascript
const Calculator = require('cqm-execution').Calculator;

// Example fixture loader (useful for this example).
const fs = require('fs');
const getJSONFixture = function(fixturePath) { 
  var contents = fs.readFileSync('spec/fixtures/json/' + fixturePath);
  return JSON.parse(contents);
};

// Load value sets from test fixtures, the getJSONFixture base path is spec/fixtures/json
const valueSets = getJSONFixture('measures/CMS107v6/value_sets.json');

// Load a measure from test fixtures.
const measure = getJSONFixture('measures/CMS107v6/CMS107v6.json');

// Load in an example patient from test fixtures
let patients = [];
// The calculator will return results for each patient in this array
patients.push(getJSONFixture('patients/CMS107v6/IPPFail_LOS=121Days.json'));

// Example options; includes directive to produce pretty statement results.
const options = { doPretty: true };

// Calculate results.
const calculationResults = Calculator.calculate(measure, patients, valueSets, options);
```

## Versioning

Starting with version **2.0.0** released on 6/20/2019, cqm-execution versioning has the format **X.Y.Z**, where:

* **X** maps to a version of CQL. See the table below to see the existing mapping to CQL versions.

  | X | CQL version |
  | --- | --- |
  | 2 | 1.3 |
  | 3 | 1.4 |

* **Y** indicates major changes (incompatible API changes)

* **Z** indicates minor changes (added functionality in a backwards-compatible manner) and patch changes (backwards-compatible bug fixes)

For the versions available, see [tags on this repository](https://github.com/projecttacoma/cqm-execution/tags).


## License

Copyright 2018 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
