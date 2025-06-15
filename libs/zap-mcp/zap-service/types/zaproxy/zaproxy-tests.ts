/* eslint-disable @typescript-eslint/no-unused-vars */
import ZAPClient from 'zaproxy';

// Test client initialization
const client = new ZAPClient({
  apiKey: 'test-api-key',
  proxy: 'http://localhost:8080',
});

// Test core API
async function testCoreAPI() {
  const version = await client.core.version();
  const versionString: string = version.version;

  const hosts = await client.core.hosts();
  const hostList: string[] = hosts.hosts;

  const alerts = await client.core.alerts('https://example.com', 0, 100, '1');
  alerts.alerts.forEach((alert) => {
    const id: string = alert.id;
    const name: string = alert.name;
    const risk: string = alert.riskCode;
  });

  await client.core.newSession('test-session', true);
  await client.core.loadSession('test-session');
  await client.core.shutdown();
}

// Test context API
async function testContextAPI() {
  const contexts = await client.context.contextList();
  const contextNames: string[] = contexts.contextList;

  const contextResponse = await client.context.newContext('test-context');
  const contextId: string = contextResponse.contextId;

  await client.context.includeInContext(
    'test-context',
    'https://example.com.*'
  );
  await client.context.excludeFromContext('test-context', '.*logout.*');
  await client.context.removeContext('test-context');
}

// Test authentication API
async function testAuthenticationAPI() {
  const methods =
    await client.authentication.getSupportedAuthenticationMethods();
  const methodList: string[] = methods.supportedMethods;

  await client.authentication.setAuthenticationMethod(
    '1',
    'formBasedAuthentication',
    'loginUrl=https://example.com/login'
  );

  await client.authentication.setLoggedInIndicator('1', '.*Welcome.*');
  await client.authentication.setLoggedOutIndicator('1', '.*Login.*');
}

// Test users API
async function testUsersAPI() {
  const userResponse = await client.users.newUser('1', 'testuser');
  const userId: string = userResponse.userId;

  await client.users.setUserEnabled('1', userId, true);
  await client.users.setAuthenticationCredentials(
    '1',
    userId,
    'username=testuser&password=testpass'
  );

  const users = await client.users.usersList('1');
  users.usersList.forEach((user) => {
    const name: string = user.name;
    const enabled: boolean = user.enabled;
  });
}

// Test spider API
async function testSpiderAPI() {
  const scanResponse = await client.spider.scan(
    'https://example.com',
    10,
    true,
    'test-context',
    false
  );
  const scanId: string = scanResponse.scan;

  const status = await client.spider.status(scanId);
  const statusValue: string = status.status;

  const results = await client.spider.results(scanId);
  const urls: string[] = results.results;

  await client.spider.pause(scanId);
  await client.spider.resume(scanId);
  await client.spider.stop(scanId);
}

// Test active scan API
async function testAscanAPI() {
  const scanResponse = await client.ascan.scan(
    'https://example.com',
    true,
    false,
    'Default Policy',
    'GET',
    ''
  );
  const scanId: string = scanResponse.scan;

  const status = await client.ascan.status(scanId);
  const progress: string = status.status;

  const scanProgress = await client.ascan.scanProgress(scanId);
  scanProgress.scanProgress.forEach((item) => {
    const name: string = item.name;
    const progressValue: string = item.progress;
  });

  await client.ascan.pause(scanId);
  await client.ascan.resume(scanId);
  await client.ascan.stop(scanId);

  await client.ascan.setScannerAttackStrength(
    '40018',
    'HIGH',
    'Default Policy'
  );
}

// Test passive scan API
async function testPscanAPI() {
  const recordsToScan = await client.pscan.recordsToScan();
  const count: string = recordsToScan.recordsToScan;

  const scanners = await client.pscan.scanners();
  scanners.scanners.forEach((scanner) => {
    const id: string = scanner.id;
    const name: string = scanner.name;
    const enabled: boolean = scanner.enabled;
  });

  await client.pscan.setEnabled(true);
  await client.pscan.setScanOnlyInScope(true);
  await client.pscan.enableAllScanners();
  await client.pscan.disableScanners('10015,10016');
}

// Test search API
async function testSearchAPI() {
  const urlResults = await client.search.urlsByUrlRegex(
    '.*admin.*',
    'https://example.com',
    0,
    100
  );
  urlResults.urls.forEach((item) => {
    const url: string = item.url;
    const method: string = item.method;
  });

  const messages = await client.search.messagesByResponseRegex(
    '.*error.*',
    'https://example.com'
  );
  messages.messages.forEach((msg) => {
    const id: string = msg.id;
    const timestamp: string = msg.timestamp;
  });
}

// Test break API
async function testBreakAPI() {
  const isBreakAll = await client.break.isBreakAll();
  const breakAll: boolean = isBreakAll.breakAll;

  await client.break.break('http-all', 'on');
  await client.break.setHttpMessage(
    'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n'
  );
  await client.break.continue();
  await client.break.drop();
}

// Test session management API
async function testSessionManagementAPI() {
  const methods =
    await client.sessionManagement.getSupportedSessionManagementMethods();
  const methodList: string[] = methods.supportedMethods;

  await client.sessionManagement.setSessionManagementMethod(
    '1',
    'cookieBasedSessionManagement',
    'sessionTokenNames=JSESSIONID'
  );
}

// Test HTTP sessions API
async function testHttpSessionsAPI() {
  const sessions = await client.httpSessions.sessions('https://example.com');
  sessions.sessions.forEach((session) => {
    const name: string = session.name;
    const tokens: string[] = session.tokens;
  });

  await client.httpSessions.createEmptySession(
    'https://example.com',
    'test-session'
  );
  await client.httpSessions.setActiveSession(
    'https://example.com',
    'test-session'
  );
  await client.httpSessions.addSessionToken('https://example.com', 'SESSIONID');
}

// Test autoupdate API
async function testAutoupdateAPI() {
  const latestVersion = await client.autoupdate.latestVersionNumber();
  const version: string = latestVersion.latestVersionNumber;

  const isLatest = await client.autoupdate.isLatestVersion();
  const latest: boolean = isLatest.isLatestVersion;

  const addons = await client.autoupdate.installedAddons();
  addons.installedAddons.forEach((addon) => {
    const id: string = addon.id;
    const name: string = addon.name;
    const version: string = addon.version;
  });

  await client.autoupdate.installAddon('pscanrules-release');
  await client.autoupdate.uninstallAddon('pscanrules-release');
}

// Test forced user API
async function testForcedUserAPI() {
  const isEnabled = await client.forcedUser.isForcedUserModeEnabled();
  const enabled: boolean = isEnabled.forcedModeEnabled;

  await client.forcedUser.setForcedUser('1', '1');
  await client.forcedUser.setForcedUserModeEnabled(true);

  const forcedUser = await client.forcedUser.getForcedUser('1');
  const userId: string = forcedUser.userId;
}

// Type assertions to ensure proper typing
type AssertCoreAPI = typeof client.core;
type AssertContextAPI = typeof client.context;
type AssertAuthAPI = typeof client.authentication;
type AssertUsersAPI = typeof client.users;
type AssertSpiderAPI = typeof client.spider;
type AssertAscanAPI = typeof client.ascan;
type AssertPscanAPI = typeof client.pscan;
type AssertSearchAPI = typeof client.search;
type AssertBreakAPI = typeof client.break;
type AssertSessionMgmtAPI = typeof client.sessionManagement;
type AssertHttpSessionsAPI = typeof client.httpSessions;
type AssertAutoupdateAPI = typeof client.autoupdate;
type AssertForcedUserAPI = typeof client.forcedUser;
