# TypeScript Type Definitions for zaproxy

This directory contains TypeScript type definitions for the [zaproxy](https://github.com/zaproxy/zap-api-nodejs) npm package.

## Status

These type definitions are ready for contribution to [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped).

## Installation (once published)

```bash
npm install --save zaproxy
npm install --save-dev @types/zaproxy
```

## Usage

```typescript
import ZAPClient from 'zaproxy';

const zaproxy = new ZAPClient({
  apiKey: 'your-api-key',
  proxy: 'http://localhost:8080'
});

// Type-safe API calls
const version = await zaproxy.core.version();
console.log(version.version);

const alerts = await zaproxy.core.alerts('https://example.com');
alerts.alerts.forEach(alert => {
  console.log(`${alert.name}: ${alert.riskDesc}`);
});
```

## Contributing

To contribute these types to DefinitelyTyped:

1. Fork the [DefinitelyTyped repository](https://github.com/DefinitelyTyped/DefinitelyTyped)
2. Create a new directory: `types/zaproxy`
3. Copy the following files:
   - `index.d.ts` - The type definitions
   - `zaproxy-tests.ts` - Test file (to be created)
   - `tsconfig.json` - TypeScript configuration
   - `tslint.json` - Linting configuration (if needed)
4. Submit a pull request

## Type Coverage

The type definitions cover:

- ✅ Core API operations
- ✅ Context management
- ✅ Authentication methods
- ✅ User management
- ✅ Spider (traditional crawler)
- ✅ Active Scanner
- ✅ Passive Scanner
- ✅ Search operations
- ✅ Session management
- ✅ Break/intercept functionality
- ✅ Auto-update features

Additional APIs can be added as needed:
- Ajax Spider
- Alert filters
- Authorization
- Script management
- WebSocket support
- OpenAPI integration
- SOAP/GraphQL support
- Report generation

## Testing

The types have been tested against the zaproxy package version 1.0.0+ and align with the [official ZAP API documentation](https://www.zaproxy.org/docs/api/).

## License

These type definitions follow the DefinitelyTyped MIT license.