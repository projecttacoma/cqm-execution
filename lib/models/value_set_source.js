const { ValueSetSchema } = require('cqm-models');
const mongoose = require('mongoose');

module.exports = class MongoDBPatientSource {
  /* Insert documentation here
    */

  constructor(connectionInfo) {
    mongoose.connect(connectionInfo);

    this.ValueSet = mongoose.model('Patient', ValueSetSchema);

    this.valueSetsByOid = {};
  }

  /*
    TODO: Full documentation
    This callback's signature is callback(self)
  */
  findValueSetsByOidForMeasures(measures, callback = null) {
    const self = this;
    this.index = 0;
    this.valueSetsByOid = {};

    const valueSetOidList = [];

    measures.forEach((mes) => {
      valueSetOidList.join(mes.get('value_sets'));
    });

    this.QDMPatient.find({
      // Need to transform the input array using mongoose.Types.ObjectId()
      _id: { $in: valueSetOidList },
    }, (err, valueSetsList) => {
      if (err) return Error(err);

      valueSetsList.forEach((valueSet) => {
        self.valueSetsByOid[valueSet.get('oid')] = valueSet;
      });

      if (callback != null) {
        callback(self);
      }
      return null;
    });


    return this.patients;
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
