import { ZapService } from './zap-service.js';
import { IZapConfig } from './types.js';

// Mock the ZAPClient
jest.mock('zaproxy', () => 
  jest.fn().mockImplementation(() => ({
    core: {
      version: jest.fn().mockResolvedValue({ version: '2.14.0' }),
      alerts: jest.fn().mockResolvedValue({ 
        alerts: [
          {
            id: '1',
            pluginId: '10021',
            alertRef: '10021',
            alert: 'X-Content-Type-Options Header Missing',
            name: 'X-Content-Type-Options Header Missing',
            riskCode: '1',
            confidence: '2',
            riskDesc: 'Low (Medium)',
            desc: 'The Anti-MIME-Sniffing header X-Content-Type-Options was not set...',
            instances: [],
            count: '1',
            solution: 'Ensure that the application/web server sets the Content-Type header...',
            otherInfo: '',
            reference: 'https://msdn.microsoft.com/en-us/library/gg622941%28v=vs.85%29.aspx',
            cweid: '693',
            wascid: '15',
            sourceid: '3'
          }
        ]
      }),
      newSession: jest.fn().mockResolvedValue({}),
      loadSession: jest.fn().mockResolvedValue({})
    },
    context: {
      newContext: jest.fn().mockResolvedValue({ contextId: '1' }),
      setContextDescription: jest.fn().mockResolvedValue({}),
      includeInContext: jest.fn().mockResolvedValue({}),
      excludeFromContext: jest.fn().mockResolvedValue({})
    },
    authentication: {
      setAuthenticationMethod: jest.fn().mockResolvedValue({}),
      setLoggedInIndicator: jest.fn().mockResolvedValue({}),
      setLoggedOutIndicator: jest.fn().mockResolvedValue({})
    },
    users: {
      newUser: jest.fn().mockResolvedValue({ userId: '1' }),
      setAuthenticationCredentials: jest.fn().mockResolvedValue({}),
      setUserEnabled: jest.fn().mockResolvedValue({})
    },
    spider: {
      scan: jest.fn().mockResolvedValue({ scan: '1' }),
      status: jest.fn().mockResolvedValue({ status: '100' }),
      results: jest.fn().mockResolvedValue({ results: [] }),
      stop: jest.fn().mockResolvedValue({})
    },
    ascan: {
      scan: jest.fn().mockResolvedValue({ scan: '1' }),
      scanAsUser: jest.fn().mockResolvedValue({ scan: '2' }),
      status: jest.fn().mockResolvedValue({ status: '100' }),
      scanProgress: jest.fn().mockResolvedValue({}),
      pause: jest.fn().mockResolvedValue({}),
      resume: jest.fn().mockResolvedValue({}),
      stop: jest.fn().mockResolvedValue({}),
      setScannerAttackStrength: jest.fn().mockResolvedValue({})
    }
  }))
);

describe('ZapService', () => {
  let zapService: ZapService;
  const config: IZapConfig = {
    host: 'localhost',
    port: 8080,
    apiKey: 'test-api-key'
  };

  beforeEach(() => {
    zapService = new ZapService(config);
  });

  describe('Core Operations', () => {
    it('should get ZAP version', async () => {
      const version = await zapService.getVersion();
      expect(version).toBe('2.14.0');
    });

    it('should create new session', async () => {
      await expect(zapService.newSession('test-session')).resolves.not.toThrow();
    });

    it('should load existing session', async () => {
      await expect(zapService.loadSession('test-session')).resolves.not.toThrow();
    });
  });

  describe('Context Management', () => {
    it('should create context with description', async () => {
      const contextId = await zapService.createContext('test-context', 'Test description');
      expect(contextId).toBe('1');
    });

    it('should include URL pattern in context', async () => {
      await expect(zapService.includeInContext('1', 'https://example.com.*')).resolves.not.toThrow();
    });

    it('should exclude URL pattern from context', async () => {
      await expect(zapService.excludeFromContext('1', '.*logout.*')).resolves.not.toThrow();
    });
  });

  describe('Authentication', () => {
    it('should setup form-based authentication', async () => {
      await expect(zapService.setupFormBasedAuth(
        '1',
        'https://example.com/login',
        'username={%username%}&password={%password%}',
        'username',
        'password'
      )).resolves.not.toThrow();
    });

    it('should create user', async () => {
      const userId = await zapService.createUser('1', 'testuser');
      expect(userId).toBe('1');
    });

    it('should set user credentials', async () => {
      await expect(zapService.setUserCredentials('1', '1', {
        username: 'testuser',
        password: 'testpass'
      })).resolves.not.toThrow();
    });

    it('should enable user', async () => {
      await expect(zapService.enableUser('1', '1', true)).resolves.not.toThrow();
    });
  });

  describe('Spider Operations', () => {
    it('should start spider scan', async () => {
      const scanId = await zapService.spider({
        url: 'https://example.com',
        maxChildren: 10,
        recurse: true,
        contextName: 'test-context'
      });
      expect(scanId).toBe('1');
    });

    it('should get spider status', async () => {
      const status = await zapService.getSpiderStatus('1');
      expect(status).toEqual({
        scanId: '1',
        status: 100,
        progress: 100,
        state: 'FINISHED'
      });
    });

    it('should stop spider scan', async () => {
      await expect(zapService.stopSpider('1')).resolves.not.toThrow();
    });
  });

  describe('Active Scan Operations', () => {
    it('should start active scan', async () => {
      const scanId = await zapService.activeScan({
        url: 'https://example.com',
        recurse: true,
        inScopeOnly: false
      });
      expect(scanId).toBe('1');
    });

    it('should start active scan as user', async () => {
      const scanId = await zapService.activeScanAsUser({
        url: 'https://example.com',
        contextId: '1',
        userId: '1',
        recurse: true
      });
      expect(scanId).toBe('2');
    });

    it('should get active scan status', async () => {
      const status = await zapService.getActiveScanStatus('1');
      expect(status).toEqual({
        scanId: '1',
        status: 100,
        progress: 100,
        state: 'FINISHED'
      });
    });

    it('should pause active scan', async () => {
      await expect(zapService.pauseActiveScan('1')).resolves.not.toThrow();
    });

    it('should resume active scan', async () => {
      await expect(zapService.resumeActiveScan('1')).resolves.not.toThrow();
    });

    it('should stop active scan', async () => {
      await expect(zapService.stopActiveScan('1')).resolves.not.toThrow();
    });

    it('should set attack strength', async () => {
      await expect(zapService.setAttackStrength('40018', 'HIGH')).resolves.not.toThrow();
    });
  });

  describe('Alert Management', () => {
    it('should get alerts', async () => {
      const alerts = await zapService.getAlerts('https://example.com');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].name).toBe('X-Content-Type-Options Header Missing');
    });

    it('should get alerts by risk level', async () => {
      const alerts = await zapService.getAlertsByRisk('Low', 'https://example.com');
      expect(alerts).toHaveLength(1);
    });

    it('should get alerts summary', async () => {
      const summary = await zapService.getAlertsSummary('https://example.com');
      expect(summary).toEqual({
        Informational: 0,
        Low: 1,
        Medium: 0,
        High: 0
      });
    });
  });

  describe('Utility Methods', () => {
    it('should run full scan with authentication', async () => {
      const result = await zapService.runFullScan(
        'https://example.com',
        'test-context',
        {
          loginUrl: 'https://example.com/login',
          loginData: 'username={%username%}&password={%password%}',
          username: 'testuser',
          password: 'testpass',
          usernameParam: 'username',
          passwordParam: 'password'
        }
      );

      expect(result).toEqual({
        spiderScanId: '1',
        activeScanId: '2',
        alerts: expect.any(Array)
      });
    });

    it('should run full scan without authentication', async () => {
      const result = await zapService.runFullScan('https://example.com');

      expect(result).toEqual({
        spiderScanId: '1',
        activeScanId: '1',
        alerts: expect.any(Array)
      });
    });
  });
});