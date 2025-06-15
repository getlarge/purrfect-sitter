import ZAPClient from 'zaproxy';
import {
  IZapConfig,
  IScanOptions,
  ISpiderOptions,
  IAlert,
  IScanProgress,
  TRiskLevel,
  TAttackStrength,
} from './types.js';

export class ZapService {
  private client: ZAPClient;

  constructor(config: IZapConfig) {
    const protocol = config.protocol || 'http';
    const proxy = `${protocol}://${config.host}:${config.port}`;

    this.client = new ZAPClient({
      apiKey: config.apiKey,
      proxy,
    });
  }

  // === Core Operations ===

  async getVersion(): Promise<string> {
    const result = await this.client.core.version();
    return result.version;
  }

  async newSession(name?: string, overwrite = true): Promise<void> {
    await this.client.core.newSession(name, overwrite);
  }

  async loadSession(name: string): Promise<void> {
    await this.client.core.loadSession(name);
  }

  // === Context Management ===

  async createContext(name: string, description?: string): Promise<string> {
    const result = await this.client.context.newContext(name);
    const contextId = result.contextId;

    if (description) {
      await this.client.context.setContextDescription(contextId, description);
    }

    return contextId;
  }

  async includeInContext(contextId: string, regex: string): Promise<void> {
    await this.client.context.includeInContext(contextId, regex);
  }

  async excludeFromContext(contextId: string, regex: string): Promise<void> {
    await this.client.context.excludeFromContext(contextId, regex);
  }

  // === Authentication ===

  async setupFormBasedAuth(
    contextId: string,
    loginUrl: string,
    loginRequestData: string,
    usernameParam: string,
    passwordParam: string
  ): Promise<void> {
    // Set authentication method
    await this.client.authentication.setAuthenticationMethod(
      contextId,
      'formBasedAuthentication',
      `loginUrl=${encodeURIComponent(
        loginUrl
      )}&loginRequestData=${encodeURIComponent(loginRequestData)}`
    );

    // Set logged in/out indicators if needed
    await this.client.authentication.setLoggedInIndicator(
      contextId,
      '.*Logout.*'
    );
    await this.client.authentication.setLoggedOutIndicator(
      contextId,
      '.*Login.*'
    );
  }

  async createUser(contextId: string, name: string): Promise<string> {
    const result = await this.client.users.newUser(contextId, name);
    return result.userId;
  }

  async setUserCredentials(
    contextId: string,
    userId: string,
    credentials: Record<string, string>
  ): Promise<void> {
    const configParams = Object.entries(credentials)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    await this.client.users.setAuthenticationCredentials(
      contextId,
      userId,
      configParams
    );
  }

  async enableUser(
    contextId: string,
    userId: string,
    enabled = true
  ): Promise<void> {
    await this.client.users.setUserEnabled(contextId, userId, enabled);
  }

  // === Spider Operations ===

  async spider(options: ISpiderOptions): Promise<string> {
    const {
      url,
      maxChildren = 0,
      recurse = true,
      contextName,
      subtreeOnly = false,
    } = options;

    const result = await this.client.spider.scan(
      url,
      maxChildren,
      recurse,
      contextName,
      subtreeOnly
    );

    return result.scan;
  }

  async getSpiderStatus(scanId: string): Promise<IScanProgress> {
    const status = await this.client.spider.status(scanId);

    return {
      scanId,
      status: parseInt(status.status),
      progress: parseInt(status.status),
      state: status.status === '100' ? 'FINISHED' : 'SCANNING',
    };
  }

  async stopSpider(scanId: string): Promise<void> {
    await this.client.spider.stop(scanId);
  }

  // === Active Scan Operations ===

  async activeScan(options: IScanOptions): Promise<string> {
    const {
      url,
      recurse = true,
      inScopeOnly = false,
      scanPolicyName,
      method,
      postData,
    } = options;

    const result = await this.client.ascan.scan(
      url,
      recurse,
      inScopeOnly,
      scanPolicyName,
      method,
      postData
    );

    return result.scan;
  }

  async activeScanAsUser(
    options: IScanOptions & { contextId: string; userId: string }
  ): Promise<string> {
    const {
      url,
      contextId,
      userId,
      recurse = true,
      scanPolicyName,
      method,
      postData,
    } = options;

    const result = await this.client.ascan.scanAsUser(
      url,
      contextId,
      userId,
      recurse,
      scanPolicyName,
      method,
      postData
    );

    return result.scan;
  }

  async getActiveScanStatus(scanId: string): Promise<IScanProgress> {
    const status = await this.client.ascan.status(scanId);

    // Parse progress details
    let state: IScanProgress['state'] = 'SCANNING';
    if (status.status === '100') {
      state = 'FINISHED';
    } else if (status.status === '0') {
      state = 'NOT_STARTED';
    }

    return {
      scanId,
      status: parseInt(status.status),
      progress: parseInt(status.status),
      state,
    };
  }

  async pauseActiveScan(scanId: string): Promise<void> {
    await this.client.ascan.pause(scanId);
  }

  async resumeActiveScan(scanId: string): Promise<void> {
    await this.client.ascan.resume(scanId);
  }

  async stopActiveScan(scanId: string): Promise<void> {
    await this.client.ascan.stop(scanId);
  }

  async setAttackStrength(
    scannerId: string,
    strength: TAttackStrength
  ): Promise<void> {
    await this.client.ascan.setScannerAttackStrength(scannerId, strength);
  }

  // === Alert Management ===

  async getAlerts(baseUrl?: string, start = 0, count = 100): Promise<IAlert[]> {
    const result = await this.client.core.alerts(baseUrl, start, count);
    return result.alerts || [];
  }

  async getAlertsByRisk(risk: TRiskLevel, baseUrl?: string): Promise<IAlert[]> {
    const allAlerts = await this.getAlerts(baseUrl);
    const riskMap: Record<TRiskLevel, string> = {
      Informational: '0',
      Low: '1',
      Medium: '2',
      High: '3',
    };

    return allAlerts.filter((alert) => alert.riskCode === riskMap[risk]);
  }

  async getAlertsSummary(
    baseUrl?: string
  ): Promise<Record<TRiskLevel, number>> {
    const alerts = await this.getAlerts(baseUrl);
    const summary: Record<TRiskLevel, number> = {
      Informational: 0,
      Low: 0,
      Medium: 0,
      High: 0,
    };

    const riskMap: Record<string, TRiskLevel> = {
      '0': 'Informational',
      '1': 'Low',
      '2': 'Medium',
      '3': 'High',
    };

    alerts.forEach((alert) => {
      const risk = riskMap[alert.riskCode];
      if (risk) {
        summary[risk]++;
      }
    });

    return summary;
  }

  // === Utility Methods ===

  async waitForSpiderComplete(
    scanId: string,
    pollInterval = 5000
  ): Promise<void> {
    while (true) {
      const status = await this.getSpiderStatus(scanId);
      if (status.state === 'FINISHED') {
        break;
      }
      await this.sleep(pollInterval);
    }
  }

  async waitForActiveScanComplete(
    scanId: string,
    pollInterval = 5000
  ): Promise<void> {
    while (true) {
      const status = await this.getActiveScanStatus(scanId);
      if (status.state === 'FINISHED') {
        break;
      }
      await this.sleep(pollInterval);
    }
  }

  async runFullScan(
    targetUrl: string,
    contextName?: string,
    authConfig?: {
      loginUrl: string;
      loginData: string;
      username: string;
      password: string;
      usernameParam: string;
      passwordParam: string;
    }
  ): Promise<{ spiderScanId: string; activeScanId: string; alerts: IAlert[] }> {
    // Create context if name provided
    let contextId: string | undefined;
    let userId: string | undefined;

    if (contextName) {
      contextId = await this.createContext(contextName);
      await this.includeInContext(contextId, `${targetUrl}.*`);

      // Setup authentication if provided
      if (authConfig) {
        await this.setupFormBasedAuth(
          contextId,
          authConfig.loginUrl,
          authConfig.loginData,
          authConfig.usernameParam,
          authConfig.passwordParam
        );

        userId = await this.createUser(contextId, authConfig.username);
        await this.setUserCredentials(contextId, userId, {
          [authConfig.usernameParam]: authConfig.username,
          [authConfig.passwordParam]: authConfig.password,
        });
        await this.enableUser(contextId, userId);
      }
    }

    // Run spider
    const spiderScanId = await this.spider({
      url: targetUrl,
      contextName,
      recurse: true,
    });

    await this.waitForSpiderComplete(spiderScanId);

    // Run active scan
    let activeScanId: string;
    if (contextId && userId) {
      activeScanId = await this.activeScanAsUser({
        url: targetUrl,
        contextId,
        userId,
        recurse: true,
      });
    } else {
      activeScanId = await this.activeScan({
        url: targetUrl,
        recurse: true,
      });
    }

    await this.waitForActiveScanComplete(activeScanId);

    // Get alerts
    const alerts = await this.getAlerts(targetUrl);

    return {
      spiderScanId,
      activeScanId,
      alerts,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
