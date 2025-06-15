# ZAP MCP Server

An intelligent MCP (Model Context Protocol) server that integrates Checkmarx ZAP (Zed Attack Proxy) security testing with conversational AI interfaces. This server enables natural language security testing using behavioral patterns, making security testing accessible and intelligent.

## Features

- **Behavioral Testing Patterns**: Use "given when then" syntax for intuitive security test description
- **Sequential Testing**: Learn from previous tests to inform subsequent testing decisions
- **API Specification Integration**: Automatically generate comprehensive test suites from OpenAPI specs
- **Intelligent Orchestration**: Combine multiple ZAP operations into meaningful security workflows

## Architecture

```
┌─────────────────────────────────────────┐
│           MCP Server Layer              │
│   (Conversational Security Testing)     │
├─────────────────────────────────────────┤
│        Behavioral Pattern Engine        │
│   (Parse & Execute "given when then")   │
├─────────────────────────────────────────┤
│           ZAP Service Layer             │
│   (Domain-specific ZAP Operations)      │
├─────────────────────────────────────────┤
│         ZAP Node.js API Client          │
│      (Official HTTP/WebSocket API)      │
└─────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Nx workspace (already configured)

### Setup

1. **Start ZAP with Docker Compose**:
   ```bash
   docker compose -f docker-compose.zap.yml up -d
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the libraries**:
   ```bash
   nx run-many -t build --projects=@purrfect-sitter/zap-service,@purrfect-sitter/behavioral-patterns,@purrfect-sitter/pattern-executor
   ```

4. **Run the MCP server**:
   ```bash
   nx serve zap-mcp-server
   ```

### Environment Variables

Create a `.env` file with:
```env
ZAP_API_KEY=your-secure-api-key
ZAP_HOST=localhost
ZAP_PORT=8080
```

## Usage

### Basic Security Scan

```typescript
// Using MCP tools
const result = await mcp.call('configure_zap', {
  targetUrl: 'https://example.com',
  context: 'example-app'
});

const scanId = await mcp.call('run_authenticated_scan', {
  context: 'example-app',
  username: 'testuser',
  password: 'testpass'
});

const status = await mcp.call('get_scan_status', { scanId });
const alerts = await mcp.call('get_scan_results', { scanId });
```

### Behavioral Pattern Testing

```typescript
// Natural language security testing
const result = await mcp.call('execute_security_pattern', {
  pattern: `
    given I am authenticated as a regular user
    when I attempt to access the admin API
    then I should receive a 403 forbidden response
  `
});
```

## Development

### Project Structure

```
libs/zap-mcp/
├── zap-service/           # Core ZAP API integration
├── behavioral-patterns/   # Pattern parsing and validation
├── pattern-executor/      # Pattern execution engine
├── api-analyzer/         # OpenAPI analysis (Phase 3)
├── test-generator/       # Test suite generation (Phase 3)
├── test-orchestrator/    # Sequential testing (Phase 4)
├── security-knowledge/   # Learning system (Phase 4)
└── adaptive-testing/     # Adaptive strategies (Phase 4)

apps/
└── zap-mcp-server/       # MCP server application
```

### Running Tests

```bash
# Run all tests
nx test zap-mcp-server

# Run specific library tests
nx test @purrfect-sitter/zap-service
nx test @purrfect-sitter/behavioral-patterns

# Run e2e tests
nx e2e zap-mcp-server-e2e
```

### Linting and Type Checking

```bash
# Lint all ZAP MCP projects
nx run-many -t lint --projects=tag:zap-mcp

# Type check
nx run-many -t typecheck --projects=tag:zap-mcp
```

## Implementation Phases

### Phase 1: Foundation (Current)
- ✅ ZAP Docker integration
- ✅ Basic Nx workspace structure
- 🔄 Core ZAP service implementation
- 🔄 Basic MCP server with essential tools

### Phase 2: Behavioral Patterns
- Pattern parser implementation
- Execution engine development
- MCP tools for pattern testing

### Phase 3: API Integration
- OpenAPI specification analysis
- Automatic test generation
- Test prioritization

### Phase 4: Intelligence
- Sequential test orchestration
- Knowledge accumulation
- Adaptive testing strategies

## API Reference

See [ZAP API Reference](./zap-api-reference.md) for detailed ZAP API documentation.

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Use conventional commits

## Security Considerations

- Always use API keys in production
- Never scan without proper authorization
- Handle sensitive data appropriately
- Follow responsible disclosure practices

## License

This project follows the same license as the purrfect-sitter repository.