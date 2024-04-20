module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: '(src/tests/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testPathIgnorePatterns: [
    "<rootDir>/__tests__/helpers.ts",
    "<rootDir>/__tests__/common_helpers.ts",
  ],
};
