import 'jest-extended';

module.exports = async function () {
  // Set longer timeout for E2E tests
  jest.setTimeout(30000);
};
