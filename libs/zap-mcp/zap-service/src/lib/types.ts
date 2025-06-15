export interface IZapConfig {
  host: string;
  port: number;
  apiKey?: string;
  protocol?: 'http' | 'https';
}

export interface IScanOptions {
  url: string;
  contextId?: string;
  userId?: string;
  recurse?: boolean;
  inScopeOnly?: boolean;
  scanPolicyName?: string;
  method?: string;
  postData?: string;
}

export interface ISpiderOptions {
  url: string;
  maxChildren?: number;
  recurse?: boolean;
  contextName?: string;
  subtreeOnly?: boolean;
}

export interface IAlert {
  id: string;
  pluginId: string;
  alertRef: string;
  alert: string;
  name: string;
  riskCode: string;
  confidence: string;
  riskDesc: string;
  desc: string;
  instances: IAlertInstance[];
  count: string;
  solution: string;
  otherInfo: string;
  reference: string;
  cweid: string;
  wascid: string;
  sourceid: string;
}

export interface IAlertInstance {
  uri: string;
  method: string;
  evidence?: string;
  param?: string;
  attack?: string;
  otherInfo?: string;
}

export interface IScanProgress {
  scanId: string;
  status: number;
  progress: number;
  state: 'NOT_STARTED' | 'SCANNING' | 'PAUSED' | 'FINISHED';
}

export interface IContext {
  id: string;
  name: string;
  description?: string;
  inScope: boolean;
}

export interface IAuthMethod {
  type: 'formBased' | 'scriptBased' | 'jsonBased' | 'httpAuthentication';
  loginUrl?: string;
  loginRequestData?: string;
  logoutUrl?: string;
  loggedInIndicator?: string;
  loggedOutIndicator?: string;
}

export interface IUser {
  id: string;
  contextId: string;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
}

export type TRiskLevel = 'Informational' | 'Low' | 'Medium' | 'High';
export type TConfidenceLevel = 'False Positive' | 'Low' | 'Medium' | 'High' | 'User Confirmed';
export type TAttackStrength = 'LOW' | 'MEDIUM' | 'HIGH' | 'INSANE';

export interface IZapResponse<T = any> {
  Result: 'OK' | 'Error';
  Data?: T;
  Error?: string;
}