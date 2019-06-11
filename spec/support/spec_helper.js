const fs = require('fs');
const path = require('path');

const basePath = path.join('spec', 'fixtures', 'json');

module.exports.getJSONFixture = (fixturePath) => {
  const contents = fs.readFileSync(path.join(basePath, fixturePath));
  return JSON.parse(contents);
};

module.exports.getEpisodeResults = (episodeResults) => {
  let results = [];
  Object.keys(episodeResults).forEach((result) => {
    results = episodeResults[result].observation_values.concat(results);
  });
  return results;
};
