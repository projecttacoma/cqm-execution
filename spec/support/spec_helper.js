const fs = require("fs");
const path = require("path");

const basePath = path.join('spec', 'fixtures', 'json');

module.exports.getJSONFixture = (fixturePath) => {
  var contents = fs.readFileSync(path.join(basePath, fixturePath));
  // Define to JSON type
  var jsonContent = JSON.parse(contents);
  return jsonContent;
}
