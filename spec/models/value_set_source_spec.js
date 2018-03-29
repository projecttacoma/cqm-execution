const ValueSetSource = require('../../lib/models/value_set_source.js');
const ValueSet = require('cqm-models').ValueSet;
const Measure = require('cqm-models').Measure;
const Mongoose = require('mongoose');
const Sinon = require('sinon');
require('sinon-mongoose');

const ObjectId = Mongoose.Types.ObjectId;

describe('A MongoDB ValueSet Source', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  const valueSetSource = new ValueSetSource(connectionInfo);
  const vs1 = new ValueSet({
    oid: '12345-67890-cba',
    display_name: 'Test Valueset A',
  });
  const vs2 = new ValueSet({
    oid: '1122334455-6677889900-abc',
    display_name: 'Test Valueset B',
  });
  const mes1 = new Measure({
    cms_id: 'CMS123',
    value_sets: [ObjectId(vs1.id)],
  });
  const mes2 = new Measure({
    cms_id: 'CMS321',
    value_sets: [ObjectId(vs2.id)],
  });

  const mock = Sinon.mock(valueSetSource.ValueSet).expects('find').exactly(2);

  describe('Finding a value set given a measure', () => {
    it('returns a list of value sets', () => {
      mock.yields(null, [vs1]);

      Promise.resolve(valueSetSource.findValueSetsByOidForMeasures(mes1))
        .then((response) => {
          expect(response[0]).toBe(vs1);
          expect(valueSetSource.valueSetsByOid['12345-67890-cba']).toBe(vs1);
        });
    });
  });

  describe('Finding a value set given a list of measures', () => {
    it('returns a list of value sets', () => {
      mock.yields(null, [vs1, vs2]);

      Promise.resolve(valueSetSource.findValueSetsByOidForMeasures([mes1, mes2]))
        .then((response) => {
          expect(response.length).toBe(2);
          expect(valueSetSource.valueSetsByOid['12345-67890-cba']);
        });
    });
  });
});
