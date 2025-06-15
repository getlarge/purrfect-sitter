# ZAP API Reference - LLM Friendly Documentation

## Overview

The Checkmarx ZAP (Zed Attack Proxy) API is a comprehensive REST-based interface for automating web application security testing. This document provides a structured reference for implementing ZAP integrations.

## Core Concepts

### API Structure

ZAP API follows a consistent URL pattern:

```
http://zap/<format>/<component>/<operation>/<operation_name>[/?<parameters>]
```

- **format**: Response format (JSON, XML, HTML, or OTHER)
- **component**: API component (spider, ascan, pscan, core, etc.)
- **operation**: Type of operation (view, action, other)
- **operation_name**: Specific operation to perform
- **parameters**: Query parameters for the operation

### Authentication

**API Key Authentication**

- Required for all 'action' operations and sensitive 'view' operations
- Passed as `apikey` parameter in requests
- Can be disabled for local testing (not recommended for production)

Example:

```
GET http://localhost:8080/JSON/ascan/action/scan/?apikey=your-api-key&url=https://example.com
```

## Core Components

### 1. Core API

**Purpose**: Basic ZAP operations and configuration

**Key Operations**:

- `core/view/version`: Get ZAP version
- `core/view/hosts`: List discovered hosts
- `core/view/urls`: List discovered URLs
- `core/view/alerts`: Get security alerts
- `core/action/newSession`: Start new session
- `core/action/loadSession`: Load saved session

### 2. Spider API

**Purpose**: Web crawling and discovery

**Key Operations**:

- `spider/action/scan`: Start spider scan
- `spider/view/status`: Check scan status
- `spider/view/results`: Get discovered URLs
- `spider/action/stop`: Stop running scan
- `spider/action/setOptionMaxDepth`: Set crawl depth

**Parameters**:

- `url`: Target URL to spider
- `maxChildren`: Maximum child URLs to scan
- `recurse`: Follow links recursively (true/false)
- `contextName`: Scan within specific context
- `subtreeOnly`: Limit to URL subtree (true/false)

### 3. Active Scanner (ascan)

**Purpose**: Active vulnerability testing

**Key Operations**:

- `ascan/action/scan`: Start active scan
- `ascan/view/status`: Get scan progress
- `ascan/view/scanProgress`: Detailed progress info
- `ascan/action/stop`: Stop active scan
- `ascan/action/setScannerAttackStrength`: Set attack intensity

**Attack Strengths**:

- LOW: Minimal requests
- MEDIUM: Moderate testing
- HIGH: Comprehensive testing
- INSANE: Exhaustive testing (use carefully)

### 4. Passive Scanner (pscan)

**Purpose**: Non-intrusive vulnerability detection

**Key Operations**:

- `pscan/view/scanners`: List passive scanners
- `pscan/action/enableScanners`: Enable specific scanners
- `pscan/action/disableScanners`: Disable specific scanners
- `pscan/view/recordsToScan`: Check scan queue

### 5. Context API

**Purpose**: Define application boundaries and settings

**Key Operations**:

- `context/action/newContext`: Create context
- `context/action/includeInContext`: Add URL patterns
- `context/action/excludeFromContext`: Exclude URL patterns
- `context/action/setContextInScope`: Set scope boundaries

**Context Patterns**:

- Use regex for flexible matching
- Example: `https://example.com.*` matches all paths

### 6. Authentication API

**Purpose**: Handle application authentication

**Key Operations**:

- `authentication/action/setAuthenticationMethod`: Configure auth type
- `authentication/action/setLoginUrl`: Set login endpoint
- `authentication/action/setLogoutUrl`: Set logout endpoint
- `authentication/action/setAuthenticationCredentials`: Set credentials

**Authentication Methods**:

- `formBasedAuthentication`: HTML form login
- `scriptBasedAuthentication`: Custom scripts
- `jsonBasedAuthentication`: JSON API login
- `httpAuthentication`: Basic/Digest auth

### 7. Users API

**Purpose**: Manage test user accounts

**Key Operations**:

- `users/action/newUser`: Create user
- `users/action/setUserEnabled`: Enable/disable user
- `users/action/setAuthenticationCredentials`: Set user credentials
- `users/action/setUserName`: Set username

### 8. Forced User API

**Purpose**: Test as specific users

**Key Operations**:

- `forcedUser/action/setForcedUser`: Set active user
- `forcedUser/view/getForcedUser`: Get current user
- `forcedUser/action/setForcedUserModeEnabled`: Enable forced user mode

### 9. Session Management API

**Purpose**: Handle session tokens

**Key Operations**:

- `sessionManagement/action/setSessionManagementMethod`: Configure method
- `sessionManagement/view/getSessionManagementMethod`: Get current method
- `sessionManagement/action/setSessionManagementMethodConfigParams`: Set parameters

**Session Methods**:

- `cookieBasedSessionManagement`: Cookie-based sessions
- `httpAuthSessionManagement`: HTTP auth sessions

### 10. Alert API

**Purpose**: Manage security findings

**Key Operations**:

- `alert/view/alerts`: Get all alerts
- `alert/view/alertsByRisk`: Filter by risk level
- `alert/view/alertsSummary`: Get summary statistics
- `alert/action/deleteAlert`: Remove specific alert
- `alert/action/updateAlert`: Modify alert details

**Risk Levels**:

- 0: Informational
- 1: Low
- 2: Medium
- 3: High

**Alert Structure**:

```json
{
  "alertId": "10021",
  "name": "X-Content-Type-Options Header Missing",
  "riskCode": "1",
  "confidence": "2",
  "url": "https://example.com/page",
  "method": "GET",
  "evidence": "Header not found",
  "description": "The X-Content-Type-Options header is not set...",
  "solution": "Set the X-Content-Type-Options header to 'nosniff'..."
}
```

### 11. Break API

**Purpose**: Intercept and modify requests

**Key Operations**:

- `break/action/break`: Set breakpoint
- `break/action/continue`: Resume request
- `break/action/drop`: Drop request
- `break/view/isBreakRequest`: Check break status

### 12. WebSocket API

**Purpose**: Test WebSocket connections

**Key Operations**:

- `websocket/view/channels`: List WebSocket channels
- `websocket/view/messages`: Get WebSocket messages
- `websocket/action/sendTextMessage`: Send text message
- `websocket/action/setBreakTextMessage`: Set message breakpoint

## Common Workflows

### 1. Basic Vulnerability Scan

```javascript
// 1. Start spider
POST /JSON/spider/action/scan/?url=https://example.com&apikey=key

// 2. Check spider status
GET /JSON/spider/view/status/?scanId=0&apikey=key

// 3. Start active scan
POST /JSON/ascan/action/scan/?url=https://example.com&apikey=key

// 4. Check scan progress
GET /JSON/ascan/view/status/?scanId=0&apikey=key

// 5. Get alerts
GET /JSON/core/view/alerts/?baseurl=https://example.com&apikey=key
```

### 2. Authenticated Scanning

```javascript
// 1. Create context
POST /JSON/context/action/newContext/?contextName=MyApp&apikey=key

// 2. Include URLs
POST /JSON/context/action/includeInContext/?contextName=MyApp&regex=https://example.com.*&apikey=key

// 3. Set authentication method
POST /JSON/authentication/action/setAuthenticationMethod/?contextId=1&authMethodName=formBasedAuthentication&apikey=key

// 4. Configure login details
POST /JSON/authentication/action/setLoginUrl/?contextId=1&loginUrl=https://example.com/login&apikey=key

// 5. Create user
POST /JSON/users/action/newUser/?contextId=1&name=testuser&apikey=key

// 6. Set credentials
POST /JSON/users/action/setAuthenticationCredentials/?contextId=1&userId=1&authCredentialsConfigParams=username%3Dtestuser%26password%3Dpassword&apikey=key

// 7. Enable forced user
POST /JSON/forcedUser/action/setForcedUserModeEnabled/?boolean=true&apikey=key

// 8. Run authenticated scan
POST /JSON/ascan/action/scanAsUser/?url=https://example.com&contextId=1&userId=1&apikey=key
```

### 3. API Testing with OpenAPI

```javascript
// 1. Import OpenAPI definition
POST /JSON/what /action/importFile/?file=/path/to/openapi.json&apikey=key

// 2. Generate test plan
POST /JSON/openapi/action/generateTestPlan/?apikey=key

// 3. Execute API scan
POST /JSON/ascan/action/scan/?url=https://api.example.com&apikey=key
```

## Best Practices

### 1. Session Management

- Always create a new session for isolated testing
- Save sessions for later analysis
- Clear sessions between different applications

### 2. Scanning Strategy

- Start with spider to discover content
- Run passive scan for quick issues
- Use active scan for thorough testing
- Adjust attack strength based on target

### 3. Authentication Testing

- Test both authenticated and unauthenticated perspectives
- Verify session management configuration
- Use forced user mode for consistent auth

### 4. Performance Considerations

- Limit spider depth for large applications
- Use context to focus scanning
- Monitor scan progress and resource usage
- Implement proper error handling

### 5. Security Considerations

- Always use API key in production
- Restrict ZAP access to authorized users
- Never scan without permission
- Handle sensitive data appropriately

## Error Handling

### Common Error Responses

```json
{
  "code": "illegal_parameter",
  "message": "Parameter 'url' is not a valid URL"
}
```

### Error Codes

- `illegal_parameter`: Invalid parameter value
- `missing_parameter`: Required parameter missing
- `bad_api_key`: Invalid or missing API key
- `internal_error`: ZAP internal error
- `not_found`: Resource not found

## Response Formats

### JSON Format

```json
{
  "Result": "OK",
  "Data": {
    // Response data
  }
}
```

### XML Format

```xml
<response>
  <result>OK</result>
  <data>
    <!-- Response data -->
  </data>
</response>
```

## WebSocket Support

ZAP supports WebSocket connections for real-time updates:

1. Connect to `ws://localhost:8080/websocket/`
2. Send JSON commands
3. Receive event notifications

Example WebSocket message:

```json
{
  "event": "alert.added",
  "alert": {
    "id": "123",
    "risk": "High",
    "name": "SQL Injection"
  }
}
```

## Rate Limiting and Performance

- No built-in rate limiting
- Concurrent operations supported
- Resource usage depends on scan configuration
- Monitor memory usage for large scans

## Integration Tips

### 1. Use Official Client Libraries

The Node.js client provides TypeScript support:

```javascript
const ZapClient = require('zaproxy');
const zaproxy = new ZapClient({
  apiKey: 'your-api-key',
  proxy: 'http://localhost:8080',
});
```

### 2. Implement Retry Logic

```javascript
async function retryOperation(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### 3. Handle Long-Running Operations

```javascript
async function waitForScanCompletion(scanId) {
  while (true) {
    const status = await zap.ascan.status(scanId);
    if (status >= 100) break;
    await sleep(5000); // Check every 5 seconds
  }
}
```

## Debugging

### Enable Debug Logging

1. Set ZAP log level to DEBUG
2. Monitor ZAP console output
3. Check API response headers for timing

### Common Issues

- **Connection refused**: Ensure ZAP is running and API enabled
- **Unauthorized**: Check API key configuration
- **Timeout**: Increase client timeout for long operations
- **Memory errors**: Reduce scan scope or increase ZAP memory

This documentation provides a comprehensive reference for implementing ZAP API integrations. For specific implementation examples, refer to the official ZAP API documentation and client library examples.
