const { ValueSetSchema } = require('cqm-models');
const mongoose = require('mongoose');
const _ = require('lodash');

module.exports = class MongoDBValueSetSource {
  /* Insert documentation here
    */

  constructor(connectionInfo) {
    mongoose.connect(connectionInfo);

    this.ValueSet = mongoose.model('Health_Data_Standards_SVS_Value_Set', ValueSetSchema);

    this.valueSetsByMongoid = {};
  }

  /*
    TODO: Full documentation
    This callback's signature is callback(self)
  */
  async findValueSetsByMongoidForMeasures(measures, callback = null) {
    const self = this;
    this.index = 0;
    this.valueSetsByMongoid = {};

    const measureList = Array.isArray(measures) ? measures : [measures];

    let valueSetOidList = [];
    measureList.forEach((mes) => {
      valueSetOidList = valueSetOidList.concat(mes.get('value_sets'));
    });

    return this.ValueSet.find({
      // Need to transform the input array using mongoose.Types.ObjectId()
      _id: { $in: valueSetOidList },
    }, (err, valueSets) => {
      if (err) return Error(err);

      let valueSetsList = Array.isArray(valueSets) ? valueSets : [valueSets];
      valueSetsList = _.map(valueSetsList, vs => self.ValueSet(vs.toObject()));

      valueSetsList.forEach((valueSet) => {
        self.valueSetsByMongoid[valueSet.id] = valueSet;
      });

      if (callback != null) {
        callback(self);
      }
      return valueSetsList;
    });
  }

  reset() {
    this.index = 0;
  }

  getLength() {
    return this.patients.length();
  }

  currentPatient() {
    return this.patients[this.index];
  }

  nextPatient() {
    if (this.index >= this.patients.length) {
      return null;
    }
    const nextPatient = this.currentPatient();
    this.index += 1;
    return nextPatient;
  }
};
