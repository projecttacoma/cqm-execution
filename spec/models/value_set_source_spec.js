const ValueSetSource = require('../../lib/models/value_set_source.js');
const Measure = require('cqm-models').Measure;
const Mongoose = require('mongoose');
const Sinon = require('sinon');
require('sinon-mongoose');

const ObjectId = Mongoose.Types.ObjectId;

describe('A MongoDB ValueSet Source', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  const valueSetSource = new ValueSetSource(connectionInfo);
  const vs1 = valueSetSource.ValueSet({
    oid: '12345-67890-cba',
    version: '',
    display_name: 'Test Valueset A',
  });
  const vs2 = valueSetSource.ValueSet({
    oid: '1122334455-6677889900-abc',
    version: '',
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

  const mock = Sinon.mock(valueSetSource.ValueSet);
  let mockExpects;

  beforeAll(() => {
    mockExpects = mock.expects('find').exactly(2);
  });
  afterAll(() => {
    mock.restore();
  });
  describe('Finding a value set given a measure', () => {
    it('returns a list of value sets', () => {
      mockExpects.yields(null, [vs1]);

      Promise.resolve(valueSetSource.findValueSetsByMongoidForMeasures(mes1))
        .then((response) => {
          expect(response[0].display_name).toBe(vs1.display_name);
          expect(valueSetSource.valueSetsByMongoid[vs1._id].oid).toBe(vs1.oid);
        });
    });
  });

  describe('Finding a value set given a list of measures', () => {
    it('returns a list of value sets', () => {
      mockExpects.yields(null, [vs1, vs2]);

      Promise.resolve(valueSetSource.findValueSetsByMongoidForMeasures([mes1, mes2]))
        .then((response) => {
          expect(response.length).toBe(2);
          expect(valueSetSource.valueSetsByMongoid[vs2._id].oid).toBe(vs2.oid);
        });
    });
  });
});
