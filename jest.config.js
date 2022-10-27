module.exports = {
  moduleFileExtensions: ["js", "json"],
  testRegex: ".*\\.test\\.js$",
  collectCoverageFrom: ["bin/**/*.js"],
  testEnvironment: "node",
  globalSetup: "./jest/setup.js",
  // globalTeardown: '../jest/teardown.js',
};
