module.exports = {
  name: "jest",
  testEnvironment: "node",
  verbose: true,
  roots: ["<rootDir>/lib/", "<rootDir>/spec/"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  collectCoverageFrom: [
    "lib/**/*.js",
    "!lib/browser.js",
    "!**/node_modules/**"
  ],
  setupFilesAfterEnv: ['jest-extended']
};
