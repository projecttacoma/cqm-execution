const MeasureSource = require('../../lib/models/measure_source.js');
const Measure = require('cqm-models').Measure;
const Mongoose = require('mongoose');
const Sinon = require('sinon');
require('sinon-mongoose');

const ObjectId = Mongoose.Types.ObjectId;

describe('A MongoDB Measure Source', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  const measureSource = new MeasureSource(connectionInfo);
  const mes = new Measure({
    cms_id: 'CMS123',
  });
  Sinon.mock(measureSource.CQLMeasure).expects('findOne').exactly(4).yields(null, mes);

  describe('Finding a measure given an ID', () => {
    it('returns a measure given an ID (as a string)', () => {
      Promise.resolve(measureSource.findMeasure('56337c006c5d1c6930000417'))
        .then(response => expect(response).toBe(mes));
    });

    it('returns a measure given an ID (as an ObjectId)', () => {
      Promise.resolve(measureSource.findMeasure(ObjectId('56337c006c5d1c6930000417')))
        .then(response => expect(response).toBe(mes));
    });

    it('returns an error if you don\'t pass an ID', () => {
      Promise.resolve(measureSource.findMeasure(null))
        .then(response => expect(response.message).toEqual('measureId must be string or ObjectId'));
    });
  });

  describe('Finding a measure given a User ID and HQMF Set ID', () => {
    it('returns a measure given a user ID (as a string) and an HQMF ID', () => {
      Promise.resolve(measureSource.findMeasureByUser(
        '56337c006c5d1c6930000417',
        '1234-abcd-1234-abcd'
      )).then(response => expect(response).toBe(mes));
    });

    it('returns a measure given a user ID (as an ObjectId) and an HQMF ID', () => {
      Promise.resolve(measureSource.findMeasureByUser(
        ObjectId('56337c006c5d1c6930000417'),
        '1234-abcd-1234-abcd'
      )).then(response => expect(response).toBe(mes));
    });

    it('returns an error if you don\'t pass a user ID', () => {
      Promise.resolve(measureSource.findMeasureByUser(null, '1234-abcd-1234-abcd'))
        .then(response => expect(response.message).toEqual('userId must be string or ObjectId'));
    });

    it('returns an error if you don\'t pass an HQMF set ID', () => {
      Promise.resolve(measureSource.findMeasureByUser('56337c006c5d1c6930000417', null))
        .then(response => expect(response.message).toEqual('hqmfSetId must be string'));
    });
  });
});
