// Type definitions for zaproxy 1.0
// Project: https://github.com/zaproxy/zap-api-nodejs
// Definitions by: Your Name <https://github.com/yourusername>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'zaproxy' {
  export interface ZAPClientOptions {
    apiKey?: string;
    proxy: string;
  }

  export interface ZAPResponse {
    Result: 'OK' | 'Error';
    Error?: string;
  }

  export interface VersionResponse {
    version: string;
  }

  export interface ContextResponse {
    contextId: string;
  }

  export interface UserResponse {
    userId: string;
  }

  export interface ScanResponse {
    scan: string;
  }

  export interface StatusResponse {
    status: string;
  }

  export interface AlertsResponse {
    alerts: Alert[];
  }

  export interface Alert {
    id: string;
    pluginId: string;
    alertRef: string;
    alert: string;
    name: string;
    riskCode: string;
    confidence: string;
    riskDesc: string;
    desc: string;
    instances: AlertInstance[];
    count: string;
    solution: string;
    otherInfo: string;
    reference: string;
    cweid: string;
    wascid: string;
    sourceid: string;
  }

  export interface AlertInstance {
    uri: string;
    method: string;
    evidence?: string;
    param?: string;
    attack?: string;
    otherInfo?: string;
  }

  export interface HostsResponse {
    hosts: string[];
  }

  export interface UrlsResponse {
    urls: string[];
  }

  export interface MessagesResponse {
    messages: Message[];
  }

  export interface Message {
    id: string;
    requestHeader: string;
    requestBody: string;
    responseHeader: string;
    responseBody: string;
    rtt: string;
    timestamp: string;
  }

  export interface SpiderResultsResponse {
    results: string[];
  }

  export interface ScanProgressResponse {
    scanProgress: ScanProgress[];
  }

  export interface ScanProgress {
    id: string;
    name: string;
    progress: string;
    reqCount: string;
    alertCount: string;
  }

  export interface Context {
    id: string;
    name: string;
    description: string;
    inScope: boolean;
    includeRegexs: string[];
    excludeRegexs: string[];
  }

  export interface User {
    id: string;
    name: string;
    enabled: boolean;
    contextId: string;
    credentials: Record<string, string>;
  }

  export interface Scanner {
    id: string;
    name: string;
    policyId: string;
    enabled: boolean;
    alertThreshold: string;
    attackStrength: string;
  }

  export interface ScanPolicy {
    id: string;
    name: string;
    enabled: boolean;
    alertThreshold: string;
    attackStrength: string;
  }

  export interface Session {
    name: string;
    tokens: string[];
  }

  export interface Addon {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    status: string;
  }

  export interface Breakpoint {
    id: string;
    enabled: boolean;
    location: string;
    match: string;
    inverse: boolean;
    ignorecase: boolean;
  }

  export interface ExcludedParam {
    idx: number;
    name: string;
    type: string;
    url: string;
  }

  export interface ScanInfo {
    id: string;
    progress: string;
    state: string;
    reqCount: string;
    alertCount: string;
    targetCount: string;
    requestsPerSec: string;
  }

  export class ZAPClient {
    constructor(options: ZAPClientOptions);

    core: {
      version(): Promise<VersionResponse>;
      hosts(): Promise<HostsResponse>;
      urls(): Promise<UrlsResponse>;
      alerts(baseurl?: string, start?: number, count?: number, riskId?: string): Promise<AlertsResponse>;
      messages(baseurl?: string, start?: number, count?: number): Promise<MessagesResponse>;
      message(id: string): Promise<Message>;
      numberOfMessages(baseurl?: string): Promise<{ numberOfMessages: string }>;
      numberOfAlerts(baseurl?: string, riskId?: string): Promise<{ numberOfAlerts: string }>;
      mode(): Promise<{ mode: string }>;
      setMode(mode: string): Promise<ZAPResponse>;
      newSession(name?: string, overwrite?: boolean): Promise<ZAPResponse>;
      loadSession(name: string): Promise<ZAPResponse>;
      saveSession(name: string, overwrite?: boolean): Promise<ZAPResponse>;
      sessions(): Promise<{ sessions: string[] }>;
      activeSession(): Promise<{ session: string }>;
      sessionLocation(): Promise<{ location: string }>;
      setSessionName(name: string): Promise<ZAPResponse>;
      clearExcludedFromProxy(): Promise<ZAPResponse>;
      excludeFromProxy(regex: string): Promise<ZAPResponse>;
      homeDirectory(): Promise<{ homeDirectory: string }>;
      optionDefaultUserAgent(): Promise<{ DefaultUserAgent: string }>;
      optionHttpStateEnabled(): Promise<{ HttpStateEnabled: string }>;
      optionProxyChainPort(): Promise<{ ProxyChainPort: string }>;
      optionProxyChainPrompt(): Promise<{ ProxyChainPrompt: string }>;
      optionTimeoutInSecs(): Promise<{ TimeoutInSecs: string }>;
      optionUseProxyChain(): Promise<{ UseProxyChain: string }>;
      optionUseProxyChainAuth(): Promise<{ UseProxyChainAuth: string }>;
      proxies(): Promise<{ proxies: string[] }>;
      setHomeDirectory(dir: string): Promise<ZAPResponse>;
      setOptionDefaultUserAgent(String: string): Promise<ZAPResponse>;
      setOptionHttpStateEnabled(Boolean: boolean): Promise<ZAPResponse>;
      setOptionProxyChainName(String: string): Promise<ZAPResponse>;
      setOptionProxyChainPassword(String: string): Promise<ZAPResponse>;
      setOptionProxyChainPort(Integer: number): Promise<ZAPResponse>;
      setOptionProxyChainPrompt(Boolean: boolean): Promise<ZAPResponse>;
      setOptionProxyChainRealm(String: string): Promise<ZAPResponse>;
      setOptionProxyChainSkipName(String: string): Promise<ZAPResponse>;
      setOptionProxyChainUserName(String: string): Promise<ZAPResponse>;
      setOptionTimeoutInSecs(Integer: number): Promise<ZAPResponse>;
      setOptionUseProxyChain(Boolean: boolean): Promise<ZAPResponse>;
      setOptionUseProxyChainAuth(Boolean: boolean): Promise<ZAPResponse>;
      shutdown(): Promise<ZAPResponse>;
      generateRootCA(): Promise<ZAPResponse>;
      sendRequest(request: string, followRedirects?: boolean): Promise<ZAPResponse>;
      deleteAllAlerts(): Promise<ZAPResponse>;
      deleteAlert(id: string): Promise<ZAPResponse>;
      accessUrl(url: string, followRedirects?: boolean): Promise<ZAPResponse>;
      runGarbageCollection(): Promise<ZAPResponse>;
    };

    context: {
      contextList(): Promise<{ contextList: string[] }>;
      excludeRegexs(contextName: string): Promise<{ excludeRegexs: string[] }>;
      includeRegexs(contextName: string): Promise<{ includeRegexs: string[] }>;
      context(contextName: string): Promise<{ context: Context }>;
      setContextInScope(contextName: string, booleanInScope: boolean): Promise<ZAPResponse>;
      newContext(contextName: string): Promise<ContextResponse>;
      removeContext(contextName: string): Promise<ZAPResponse>;
      exportContext(contextName: string, contextFile: string): Promise<ZAPResponse>;
      importContext(contextFile: string): Promise<ContextResponse>;
      includeInContext(contextName: string, regex: string): Promise<ZAPResponse>;
      excludeFromContext(contextName: string, regex: string): Promise<ZAPResponse>;
      setContextDescription(contextId: string, description: string): Promise<ZAPResponse>;
      setContextCheckEveryResponse(contextName: string, booleanCheckEveryResponse: boolean): Promise<ZAPResponse>;
    };

    authentication: {
      getSupportedAuthenticationMethods(): Promise<{ supportedMethods: string[] }>;
      getAuthenticationMethodConfigParams(authMethodName: string): Promise<{ methodConfigParams: string[] }>;
      getAuthenticationMethod(contextId: string): Promise<{ method: { methodName: string; parameters: Record<string, string> } }>;
      getLoggedInIndicator(contextId: string): Promise<{ loggedInIndicator: string }>;
      getLoggedOutIndicator(contextId: string): Promise<{ loggedOutIndicator: string }>;
      setAuthenticationMethod(contextId: string, authMethodName: string, authMethodConfigParams?: string): Promise<ZAPResponse>;
      setLoggedInIndicator(contextId: string, loggedInIndicatorRegex: string): Promise<ZAPResponse>;
      setLoggedOutIndicator(contextId: string, loggedOutIndicatorRegex: string): Promise<ZAPResponse>;
    };

    users: {
      usersList(contextId?: string): Promise<{ usersList: User[] }>;
      getUserById(contextId: string, userId: string): Promise<{ user: User }>;
      getAuthenticationCredentialsConfigParams(contextId: string): Promise<{ credentialsConfigParams: string[] }>;
      getAuthenticationCredentials(contextId: string, userId: string): Promise<{ credentials: Record<string, string> }>;
      newUser(contextId: string, name: string): Promise<UserResponse>;
      removeUser(contextId: string, userId: string): Promise<ZAPResponse>;
      setUserEnabled(contextId: string, userId: string, enabled: boolean): Promise<ZAPResponse>;
      setUserName(contextId: string, userId: string, name: string): Promise<ZAPResponse>;
      setAuthenticationCredentials(contextId: string, userId: string, authCredentialsConfigParams: string): Promise<ZAPResponse>;
    };

    forcedUser: {
      isForcedUserModeEnabled(): Promise<{ forcedModeEnabled: boolean }>;
      getForcedUser(contextId: string): Promise<{ userId: string }>;
      setForcedUser(contextId: string, userId: string): Promise<ZAPResponse>;
      setForcedUserModeEnabled(boolean: boolean): Promise<ZAPResponse>;
    };

    sessionManagement: {
      getSupportedSessionManagementMethods(): Promise<{ supportedMethods: string[] }>;
      getSessionManagementMethodConfigParams(methodName: string): Promise<{ methodConfigParams: string[] }>;
      getSessionManagementMethod(contextId: string): Promise<{ method: { methodName: string; parameters: Record<string, string> } }>;
      setSessionManagementMethod(contextId: string, methodName: string, methodConfigParams?: string): Promise<ZAPResponse>;
    };

    spider: {
      status(scanId?: string): Promise<StatusResponse>;
      results(scanId?: string): Promise<SpiderResultsResponse>;
      fullResults(scanId: string): Promise<{ fullResults: Array<{ messageId: string; url: string; statusCode: string; statusReason: string }> }>;
      scans(): Promise<{ scans: ScanInfo[] }>;
      excludedFromScan(): Promise<{ excludedFromScan: string[] }>;
      allUrls(): Promise<{ urls: string[] }>;
      addedNodes(scanId?: string): Promise<{ addedNodes: Array<{ name: string; type: string; method: string }> }>;
      domainsAlwaysInScope(): Promise<{ domainsAlwaysInScope: string[] }>;
      optionHandleParameters(): Promise<{ HandleParameters: string }>;
      optionMaxDepth(): Promise<{ MaxDepth: number }>;
      optionMaxDuration(): Promise<{ MaxDuration: number }>;
      optionMaxScansInUI(): Promise<{ MaxScansInUI: number }>;
      optionRequestWaitTime(): Promise<{ RequestWaitTime: number }>;
      optionScope(): Promise<{ Scope: string }>;
      optionScopeText(): Promise<{ ScopeText: string }>;
      optionSkipURLString(): Promise<{ SkipURLString: string }>;
      optionThreadCount(): Promise<{ ThreadCount: number }>;
      optionUserAgent(): Promise<{ UserAgent: string }>;
      optionAcceptCookies(): Promise<{ AcceptCookies: boolean }>;
      optionHandleODataParametersVisited(): Promise<{ HandleODataParametersVisited: boolean }>;
      optionParseComments(): Promise<{ ParseComments: boolean }>;
      optionParseGit(): Promise<{ ParseGit: boolean }>;
      optionParseRobotsTxt(): Promise<{ ParseRobotsTxt: boolean }>;
      optionParseSVNEntries(): Promise<{ ParseSVNEntries: boolean }>;
      optionParseSitemapXml(): Promise<{ ParseSitemapXml: boolean }>;
      optionPostForm(): Promise<{ PostForm: boolean }>;
      optionProcessForm(): Promise<{ ProcessForm: boolean }>;
      optionSendRefererHeader(): Promise<{ SendRefererHeader: boolean }>;
      optionShowAdvancedDialog(): Promise<{ ShowAdvancedDialog: boolean }>;
      scan(url: string, maxChildren?: number, recurse?: boolean, contextName?: string, subtreeOnly?: boolean): Promise<ScanResponse>;
      scanAsUser(contextId: string, userId: string, url: string, maxChildren?: number, recurse?: boolean, subtreeOnly?: boolean): Promise<ScanResponse>;
      pause(scanId: string): Promise<ZAPResponse>;
      resume(scanId: string): Promise<ZAPResponse>;
      stop(scanId?: string): Promise<ZAPResponse>;
      removeScan(scanId: string): Promise<ZAPResponse>;
      pauseAllScans(): Promise<ZAPResponse>;
      resumeAllScans(): Promise<ZAPResponse>;
      stopAllScans(): Promise<ZAPResponse>;
      removeAllScans(): Promise<ZAPResponse>;
      clearExcludedFromScan(): Promise<ZAPResponse>;
      excludeFromScan(regex: string): Promise<ZAPResponse>;
      addDomainAlwaysInScope(value: string): Promise<ZAPResponse>;
      modifyDomainAlwaysInScope(idx: number, value: string): Promise<ZAPResponse>;
      removeDomainAlwaysInScope(idx: number): Promise<ZAPResponse>;
      enableAllDomainsAlwaysInScope(): Promise<ZAPResponse>;
      disableAllDomainsAlwaysInScope(): Promise<ZAPResponse>;
      setOptionHandleParameters(String: string): Promise<ZAPResponse>;
      setOptionScopeString(String: string): Promise<ZAPResponse>;
      setOptionSkipURLString(String: string): Promise<ZAPResponse>;
      setOptionUserAgent(String: string): Promise<ZAPResponse>;
      setOptionAcceptCookies(Boolean: boolean): Promise<ZAPResponse>;
      setOptionHandleODataParametersVisited(Boolean: boolean): Promise<ZAPResponse>;
      setOptionMaxDepth(Integer: number): Promise<ZAPResponse>;
      setOptionMaxDuration(Integer: number): Promise<ZAPResponse>;
      setOptionMaxScansInUI(Integer: number): Promise<ZAPResponse>;
      setOptionParseComments(Boolean: boolean): Promise<ZAPResponse>;
      setOptionParseGit(Boolean: boolean): Promise<ZAPResponse>;
      setOptionParseRobotsTxt(Boolean: boolean): Promise<ZAPResponse>;
      setOptionParseSVNEntries(Boolean: boolean): Promise<ZAPResponse>;
      setOptionParseSitemapXml(Boolean: boolean): Promise<ZAPResponse>;
      setOptionPostForm(Boolean: boolean): Promise<ZAPResponse>;
      setOptionProcessForm(Boolean: boolean): Promise<ZAPResponse>;
      setOptionRequestWaitTime(Integer: number): Promise<ZAPResponse>;
      setOptionSendRefererHeader(Boolean: boolean): Promise<ZAPResponse>;
      setOptionShowAdvancedDialog(Boolean: boolean): Promise<ZAPResponse>;
      setOptionThreadCount(Integer: number): Promise<ZAPResponse>;
    };

    ascan: {
      status(scanId?: string): Promise<StatusResponse>;
      scanProgress(scanId?: string): Promise<ScanProgressResponse>;
      messagesIds(scanId: string): Promise<{ messagesIds: string[] }>;
      alertsIds(scanId: string): Promise<{ alertsIds: string[] }>;
      scans(): Promise<{ scans: ScanInfo[] }>;
      scanPolicyNames(): Promise<{ scanPolicyNames: string[] }>;
      excludedFromScan(): Promise<{ excludedFromScan: string[] }>;
      scanners(scanPolicyName?: string, policyId?: string): Promise<{ scanners: Scanner[] }>;
      policies(scanPolicyName?: string, policyId?: string): Promise<{ policies: ScanPolicy[] }>;
      attackModeQueue(): Promise<{ attackModeQueue: number }>;
      excludedParams(): Promise<{ excludedParams: ExcludedParam[] }>;
      excludedParamTypes(): Promise<{ excludedParamTypes: string[] }>;
      optionAttackPolicy(): Promise<{ AttackPolicy: string }>;
      optionDefaultPolicy(): Promise<{ DefaultPolicy: string }>;
      optionDelayInMs(): Promise<{ DelayInMs: number }>;
      optionHandleAntiCSRFTokens(): Promise<{ HandleAntiCSRFTokens: boolean }>;
      optionHostPerScan(): Promise<{ HostPerScan: number }>;
      optionMaxChartTimeInMins(): Promise<{ MaxChartTimeInMins: number }>;
      optionMaxResultsToList(): Promise<{ MaxResultsToList: number }>;
      optionMaxRuleDurationInMins(): Promise<{ MaxRuleDurationInMins: number }>;
      optionMaxScanDurationInMins(): Promise<{ MaxScanDurationInMins: number }>;
      optionMaxScansInUI(): Promise<{ MaxScansInUI: number }>;
      optionTargetParamsEnabledRPC(): Promise<{ TargetParamsEnabledRPC: boolean }>;
      optionTargetParamsInjectable(): Promise<{ TargetParamsInjectable: number }>;
      optionThreadPerHost(): Promise<{ ThreadPerHost: number }>;
      optionAllowAttackOnStart(): Promise<{ AllowAttackOnStart: boolean }>;
      optionInjectPluginIdInHeader(): Promise<{ InjectPluginIdInHeader: boolean }>;
      optionPromptInAttackMode(): Promise<{ PromptInAttackMode: boolean }>;
      optionPromptToClearFinishedScans(): Promise<{ PromptToClearFinishedScans: boolean }>;
      optionRescanInAttackMode(): Promise<{ RescanInAttackMode: boolean }>;
      optionScanHeadersAllRequests(): Promise<{ ScanHeadersAllRequests: boolean }>;
      optionShowAdvancedDialog(): Promise<{ ShowAdvancedDialog: boolean }>;
      scan(url: string, recurse?: boolean, inScopeOnly?: boolean, scanPolicyName?: string, method?: string, postData?: string): Promise<ScanResponse>;
      scanAsUser(url: string, contextId: string, userId: string, recurse?: boolean, scanPolicyName?: string, method?: string, postData?: string): Promise<ScanResponse>;
      pause(scanId: string): Promise<ZAPResponse>;
      resume(scanId: string): Promise<ZAPResponse>;
      stop(scanId: string): Promise<ZAPResponse>;
      removeScan(scanId: string): Promise<ZAPResponse>;
      pauseAllScans(): Promise<ZAPResponse>;
      resumeAllScans(): Promise<ZAPResponse>;
      stopAllScans(): Promise<ZAPResponse>;
      removeAllScans(): Promise<ZAPResponse>;
      clearExcludedFromScan(): Promise<ZAPResponse>;
      excludeFromScan(regex: string): Promise<ZAPResponse>;
      enableAllScanners(scanPolicyName?: string): Promise<ZAPResponse>;
      disableAllScanners(scanPolicyName?: string): Promise<ZAPResponse>;
      enableScanners(ids: string, scanPolicyName?: string): Promise<ZAPResponse>;
      disableScanners(ids: string, scanPolicyName?: string): Promise<ZAPResponse>;
      setEnabledPolicies(ids: string, scanPolicyName?: string): Promise<ZAPResponse>;
      setPolicyAttackStrength(id: string, attackStrength: string, scanPolicyName?: string): Promise<ZAPResponse>;
      setPolicyAlertThreshold(id: string, alertThreshold: string, scanPolicyName?: string): Promise<ZAPResponse>;
      setScannerAttackStrength(id: string, attackStrength: string, scanPolicyName?: string): Promise<ZAPResponse>;
      setScannerAlertThreshold(id: string, alertThreshold: string, scanPolicyName?: string): Promise<ZAPResponse>;
      addScanPolicy(scanPolicyName: string, alertThreshold?: string, attackStrength?: string): Promise<ZAPResponse>;
      removeScanPolicy(scanPolicyName: string): Promise<ZAPResponse>;
      updateScanPolicy(scanPolicyName: string, alertThreshold?: string, attackStrength?: string): Promise<ZAPResponse>;
      importScanPolicy(path: string): Promise<ZAPResponse>;
      addExcludedParam(name: string, type?: string, url?: string): Promise<ZAPResponse>;
      modifyExcludedParam(idx: number, name?: string, type?: string, url?: string): Promise<ZAPResponse>;
      removeExcludedParam(idx: number): Promise<ZAPResponse>;
      skipScanner(scannerName: string, scanPolicyName?: string): Promise<ZAPResponse>;
      setOptionAttackPolicy(String: string): Promise<ZAPResponse>;
      setOptionDefaultPolicy(String: string): Promise<ZAPResponse>;
      setOptionAllowAttackOnStart(Boolean: boolean): Promise<ZAPResponse>;
      setOptionDelayInMs(Integer: number): Promise<ZAPResponse>;
      setOptionHandleAntiCSRFTokens(Boolean: boolean): Promise<ZAPResponse>;
      setOptionHostPerScan(Integer: number): Promise<ZAPResponse>;
      setOptionInjectPluginIdInHeader(Boolean: boolean): Promise<ZAPResponse>;
      setOptionMaxChartTimeInMins(Integer: number): Promise<ZAPResponse>;
      setOptionMaxResultsToList(Integer: number): Promise<ZAPResponse>;
      setOptionMaxRuleDurationInMins(Integer: number): Promise<ZAPResponse>;
      setOptionMaxScanDurationInMins(Integer: number): Promise<ZAPResponse>;
      setOptionMaxScansInUI(Integer: number): Promise<ZAPResponse>;
      setOptionPromptInAttackMode(Boolean: boolean): Promise<ZAPResponse>;
      setOptionPromptToClearFinishedScans(Boolean: boolean): Promise<ZAPResponse>;
      setOptionRescanInAttackMode(Boolean: boolean): Promise<ZAPResponse>;
      setOptionScanHeadersAllRequests(Boolean: boolean): Promise<ZAPResponse>;
      setOptionShowAdvancedDialog(Boolean: boolean): Promise<ZAPResponse>;
      setOptionTargetParamsEnabledRPC(Boolean: boolean): Promise<ZAPResponse>;
      setOptionTargetParamsInjectable(Integer: number): Promise<ZAPResponse>;
      setOptionThreadPerHost(Integer: number): Promise<ZAPResponse>;
    };

    pscan: {
      recordsToScan(): Promise<{ recordsToScan: string }>;
      scanners(): Promise<{ scanners: Scanner[] }>;
      setEnabled(enabled: boolean): Promise<ZAPResponse>;
      setScanOnlyInScope(onlyInScope: boolean): Promise<ZAPResponse>;
      enableAllScanners(): Promise<ZAPResponse>;
      disableAllScanners(): Promise<ZAPResponse>;
      enableScanners(ids: string): Promise<ZAPResponse>;
      disableScanners(ids: string): Promise<ZAPResponse>;
      setScannerAlertThreshold(id: string, alertThreshold: string): Promise<ZAPResponse>;
      enableAllTags(): Promise<ZAPResponse>;
      disableAllTags(): Promise<ZAPResponse>;
      optionMaxAlertsPerRule(): Promise<{ MaxAlertsPerRule: number }>;
      optionShowAdvancedDialog(): Promise<{ ShowAdvancedDialog: boolean }>;
      setOptionMaxAlertsPerRule(Integer: number): Promise<ZAPResponse>;
      setOptionShowAdvancedDialog(Boolean: boolean): Promise<ZAPResponse>;
    };

    search: {
      urlsByUrlRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ urls: Array<{ url: string; method: string }> }>;
      urlsByRequestRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ urls: Array<{ url: string; method: string }> }>;
      urlsByResponseRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ urls: Array<{ url: string; method: string }> }>;
      urlsByHeaderRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ urls: Array<{ url: string; method: string }> }>;
      messagesByUrlRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ messages: Message[] }>;
      messagesByRequestRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ messages: Message[] }>;
      messagesByResponseRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ messages: Message[] }>;
      messagesByHeaderRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<{ messages: Message[] }>;
      harByUrlRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<object>;
      harByRequestRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<object>;
      harByResponseRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<object>;
      harByHeaderRegex(regex: string, baseurl?: string, start?: number, count?: number): Promise<object>;
    };

    httpSessions: {
      sessions(site: string, session?: string): Promise<{ sessions: Session[] }>;
      activeSession(site: string): Promise<{ activeSession: string }>;
      sessionTokens(site: string): Promise<{ sessionTokens: string[] }>;
      defaultSessionTokens(): Promise<{ defaultSessionTokens: string[] }>;
      createEmptySession(site: string, session?: string): Promise<ZAPResponse>;
      removeSession(site: string, session: string): Promise<ZAPResponse>;
      setActiveSession(site: string, session: string): Promise<ZAPResponse>;
      unsetActiveSession(site: string): Promise<ZAPResponse>;
      addSessionToken(site: string, sessionToken: string): Promise<ZAPResponse>;
      removeSessionToken(site: string, sessionToken: string): Promise<ZAPResponse>;
      setSessionTokenValue(site: string, session: string, sessionToken: string, tokenValue: string): Promise<ZAPResponse>;
      renameSession(site: string, oldSessionName: string, newSessionName: string): Promise<ZAPResponse>;
      addDefaultSessionToken(sessionToken: string, tokenEnabled?: boolean): Promise<ZAPResponse>;
      setDefaultSessionTokenEnabled(sessionToken: string, tokenEnabled: boolean): Promise<ZAPResponse>;
      removeDefaultSessionToken(sessionToken: string): Promise<ZAPResponse>;
    };

    break: {
      isBreakAll(): Promise<{ breakAll: boolean }>;
      isBreakRequest(): Promise<{ breakRequest: boolean }>;
      isBreakResponse(): Promise<{ breakResponse: boolean }>;
      httpMessage(): Promise<{ httpMessage: string }>;
      break(type: string, state: string, scope?: string): Promise<ZAPResponse>;
      setHttpMessage(httpHeader: string, httpBody?: string): Promise<ZAPResponse>;
      continue(): Promise<ZAPResponse>;
      step(): Promise<ZAPResponse>;
      drop(): Promise<ZAPResponse>;
      addHttpBreakpoint(string: string, location: string, match: string, inverse: boolean, ignorecase: boolean): Promise<ZAPResponse>;
      removeHttpBreakpoint(string: string, location: string, match: string, inverse: boolean, ignorecase: boolean): Promise<ZAPResponse>;
    };

    autoupdate: {
      latestVersionNumber(): Promise<{ latestVersionNumber: string }>;
      isLatestVersion(): Promise<{ isLatestVersion: boolean }>;
      installedAddons(): Promise<{ installedAddons: Addon[] }>;
      newAddons(): Promise<{ newAddons: Addon[] }>;
      updatedAddons(): Promise<{ updatedAddons: Addon[] }>;
      marketplaceAddons(): Promise<{ marketplaceAddons: Addon[] }>;
      optionAddonDirectories(): Promise<{ AddonDirectories: string[] }>;
      optionCheckAddonUpdates(): Promise<{ CheckAddonUpdates: boolean }>;
      optionCheckOnStart(): Promise<{ CheckOnStart: boolean }>;
      optionDayLastChecked(): Promise<{ DayLastChecked: number }>;
      optionDayLastInstallWarned(): Promise<{ DayLastInstallWarned: number }>;
      optionDayLastUpdateWarned(): Promise<{ DayLastUpdateWarned: number }>;
      optionDownloadDirectory(): Promise<{ DownloadDirectory: string }>;
      optionDownloadNewRelease(): Promise<{ DownloadNewRelease: boolean }>;
      optionInstallAddonUpdates(): Promise<{ InstallAddonUpdates: boolean }>;
      optionInstallScannerRules(): Promise<{ InstallScannerRules: boolean }>;
      optionReportAlphaAddons(): Promise<{ ReportAlphaAddons: boolean }>;
      optionReportBetaAddons(): Promise<{ ReportBetaAddons: boolean }>;
      optionReportReleaseAddons(): Promise<{ ReportReleaseAddons: boolean }>;
      downloadLatestRelease(): Promise<ZAPResponse>;
      installAddon(id: string): Promise<ZAPResponse>;
      uninstallAddon(id: string): Promise<ZAPResponse>;
      setOptionCheckAddonUpdates(Boolean: boolean): Promise<ZAPResponse>;
      setOptionCheckOnStart(Boolean: boolean): Promise<ZAPResponse>;
      setOptionDownloadNewRelease(Boolean: boolean): Promise<ZAPResponse>;
      setOptionInstallAddonUpdates(Boolean: boolean): Promise<ZAPResponse>;
      setOptionInstallScannerRules(Boolean: boolean): Promise<ZAPResponse>;
      setOptionReportAlphaAddons(Boolean: boolean): Promise<ZAPResponse>;
      setOptionReportBetaAddons(Boolean: boolean): Promise<ZAPResponse>;
      setOptionReportReleaseAddons(Boolean: boolean): Promise<ZAPResponse>;
    };
  }

  export = ZAPClient;
}