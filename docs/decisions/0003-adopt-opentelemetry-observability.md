# ADR-0003: Adopt OpenTelemetry for Comprehensive Application Observability

## Metadata

- **Date**: 2025-01-24
- **Status**: Accepted
- **Deciders**: [@getlarge]
- **Technical Area**: DevOps
- **Impact Level**: High
- **Affected Nx Projects**: purrfect-sitter, @purrfect-sitter/auth-repositories, @purrfect-sitter/auth-middlewares, @purrfect-sitter/cats-services, @purrfect-sitter/cat-sittings-services, @purrfect-sitter/reviews-services

## Context

### Problem Statement

The Purrfect Sitter application requires comprehensive observability to monitor service performance, track user interactions, debug authorization flows, and analyze system behavior across multiple services and authorization strategies. Without proper instrumentation, it becomes difficult to identify performance bottlenecks, debug complex authorization scenarios, track service dependencies, and ensure optimal user experience. The application's architecture with dual authorization strategies (database vs OpenFGA) specifically requires detailed performance monitoring to validate strategy effectiveness.

### Technical Environment

**Repository**: https://github.com/getlarge/purrfect-sitter.git
**Branch**: docs-pubsub-adrs-flow
**Recent Commits** (for file path validity):

- 21b45d1: feat: replace ADR architectural review workflow with a simplified version
- df4f71f: feat: add ADR architectural review workflow for pull requests
- de9eaa9: feat: add Git and GitHub MCP config
- 201428a: feat: add ADR for adopting OpenFGA as the primary authorization strategy
- 30c1627: feat: add ADR for adopting Ory Kratos as identity and authentication management solution

**Relevant Commits** (observability context):

- 368dc6c: fix: adjust memory limits in collector configuration for optimal performance
- 8001933: feat: integrate benchmark scenarios into trace analysis and enhance trace fetching with scenario and iteration parameters
- d161152: feat: add tag query for benchmark run ID in trace fetching
- 6ffa836: feat: add trace analyzer for OpenTelemetry data analysis and performance metrics reporting
- cd5e18a: feat: improve trace analysis with detailed scenario metrics and reporting

**Nx Workspace**:

- 13 libraries across domains with modular architecture
- TypeScript monorepo using Nx 20.7.2 with ESM support
- Fastify-based backend with comprehensive plugin architecture
- Dual authorization strategy implementation requiring performance comparison

**Core Dependencies**:

- `@opentelemetry/sdk-node@0.200.0` - OpenTelemetry Node.js SDK
- `@opentelemetry/auto-instrumentations-node@0.57.1` - Automatic instrumentation
- `@opentelemetry/exporter-trace-otlp-http@0.200.0` - OTLP trace exporter
- `@opentelemetry/exporter-metrics-otlp-http@0.200.0` - OTLP metrics exporter
- `@fastify/otel@0.7.0` - Fastify OpenTelemetry integration
- `fastify@5.2.1` - Web framework with built-in observability hooks

### Constraints and Requirements

- **Performance Requirements**: Instrumentation overhead must not exceed 5% of request latency
- **Resource Requirements**: Telemetry data collection must not significantly impact memory or CPU usage
- **Integration Requirements**: Must integrate seamlessly with Fastify, Ory Kratos, OpenFGA, and PostgreSQL
- **Analysis Requirements**: Support for custom benchmark scenarios and authorization strategy performance comparison
- **Deployment Requirements**: Self-hosted telemetry stack for development, production-ready with industry-standard backends

### Alternatives Considered

1. **Application Performance Monitoring (APM) SaaS Solutions (Datadog, New Relic)**

   - Pros:
     - Fully managed with comprehensive dashboards
     - Advanced analytics and alerting capabilities
     - Extensive integrations and community support
     - Machine learning-based anomaly detection
   - Cons:
     - High costs at scale with per-host/per-user pricing
     - Vendor lock-in with proprietary agents and APIs
     - Limited customization for specific business metrics
     - Data privacy concerns with external service data transmission
     - Complex pricing models with feature restrictions

2. **Custom Logging and Metrics Solution**

   - Pros:
     - Complete control over data collection and storage
     - No external dependencies or costs
     - Custom business logic integration
     - Full data ownership and privacy
   - Cons:
     - High development and maintenance overhead
     - Need to implement correlation across services manually
     - Limited tooling and visualization capabilities
     - Difficult to achieve comprehensive coverage across all service layers
     - Time-consuming to build robust alerting and analytics

3. **Prometheus + Grafana Stack Only**

   - Pros:
     - Open-source with strong community support
     - Excellent metrics collection and visualization
     - Well-established monitoring patterns
     - Cost-effective for infrastructure monitoring
   - Cons:
     - Limited distributed tracing capabilities
     - No built-in correlation between metrics and traces
     - Requires separate logging solution
     - Complex setup for application-level observability
     - Manual instrumentation for custom metrics

4. **OpenTelemetry with Industry-Standard Backends (Chosen Solution)**
   - Pros:
     - Vendor-neutral open standard avoiding lock-in
     - Comprehensive observability: traces, metrics, and logs
     - Automatic instrumentation for popular frameworks
     - Strong ecosystem with multiple backend options
     - Future-proof with industry-wide adoption
     - Excellent performance with minimal overhead
     - Native support for correlation between telemetry types
   - Cons:
     - Learning curve for OpenTelemetry concepts and configuration
     - Additional infrastructure for telemetry backends
     - Configuration complexity for custom instrumentation
     - Requires understanding of distributed tracing concepts

## Decision

### Chosen Solution

We will adopt OpenTelemetry as our comprehensive observability solution, implementing distributed tracing, metrics collection, and structured logging with Zipkin for trace visualization, Prometheus for metrics storage, and the OpenTelemetry Collector for data aggregation.

### Implementation Approach

1. **Automatic Instrumentation**: Leverage OpenTelemetry auto-instrumentation for Fastify, HTTP, PostgreSQL, DNS, and logging frameworks
2. **Custom Instrumentation**: Add business-specific spans for authorization flows, benchmark scenarios, and service interactions
3. **Telemetry Pipeline**: Deploy OpenTelemetry Collector for data processing with Zipkin and Prometheus backends
4. **Benchmarking Integration**: Implement custom trace analysis for authorization strategy performance comparison
5. **Service Correlation**: Use trace correlation to monitor end-to-end request flows across authentication, authorization, and business logic
6. **Development-First Approach**: Local observability stack for development with production-ready scalability

### Success Criteria

- Sub-5ms instrumentation overhead for typical request processing
- Complete request correlation across authentication, authorization, and business logic
- Benchmark analysis capabilities for authorization strategy comparison
- Real-time visibility into service performance and error rates
- Comprehensive trace coverage for debugging complex authorization scenarios
- Zero data loss in telemetry collection under normal operating conditions

## Consequences

### Positive Impacts

- **Performance Visibility**: Detailed insights into authorization strategy performance differences
- **Debugging Capability**: Distributed tracing for complex multi-service request flows
- **Vendor Independence**: OpenTelemetry standard prevents vendor lock-in
- **Cost Efficiency**: Self-hosted solution with predictable infrastructure costs
- **Developer Experience**: Rich debugging information for local development
- **Production Readiness**: Industry-standard observability foundation
- **Custom Analytics**: Benchmark analysis tools for authorization strategy optimization
- **Service Reliability**: Comprehensive monitoring for service health and performance

### Negative Impacts

- **Infrastructure Complexity**: Additional services to deploy and maintain (Collector, Zipkin, Prometheus)
- **Learning Curve**: Team needs to understand OpenTelemetry concepts and distributed tracing
- **Storage Requirements**: Telemetry data requires additional storage and retention management
- **Configuration Overhead**: Complex setup for custom instrumentation and sampling strategies

### Risks and Mitigation

- **Risk**: Telemetry overhead impacts application performance

  - **Likelihood**: Low
  - **Impact**: Medium
  - **Mitigation**: Careful sampling configuration, performance monitoring of instrumentation overhead, gradual rollout

- **Risk**: Telemetry backend unavailability affects observability

  - **Likelihood**: Low
  - **Impact**: Medium
  - **Mitigation**: High-availability deployment, backup data export, graceful degradation when backends unavailable

- **Risk**: High telemetry data volume leads to storage costs

  - **Likelihood**: Medium
  - **Impact**: Low
  - **Mitigation**: Intelligent sampling strategies, data retention policies, compression and archival

- **Risk**: Complex configuration leads to incomplete observability coverage
  - **Likelihood**: Medium
  - **Impact**: Medium
  - **Mitigation**: Comprehensive testing, automated configuration validation, gradual instrumentation expansion

### Follow-up Actions

- [x] Configure OpenTelemetry SDK with automatic instrumentation
- [x] Deploy telemetry backend services (Collector, Zipkin, Prometheus)
- [x] Implement custom instrumentation for authorization flows
- [x] Create benchmark analysis tooling for authorization strategy comparison
- [ ] Set up alerting rules for critical performance thresholds
- [ ] Implement telemetry data retention and archival policies
- [ ] Create observability runbooks and troubleshooting guides
- [ ] Configure production-grade telemetry backend deployment

## Technical Context

### Affected Components

#### Primary Impact

- `apps/purrfect-sitter/src/instrumentation.mts` - OpenTelemetry SDK configuration and initialization
- `apps/purrfect-sitter/src/main.ts` - Application entry point with instrumentation bootstrap
- `libs/auth/repositories/src/lib/telemetry.ts` - OpenFGA tracing integration

#### Secondary Impact

- `libs/auth/middlewares/` - Authorization middleware performance instrumentation
- `libs/cats/services/` - Business logic service tracing
- `libs/cat-sittings/services/` - Workflow service performance monitoring
- `libs/reviews/services/` - Review service observability
- Configuration files:
  - `infra/otlp/collector-config.yml` - OpenTelemetry Collector configuration
  - `infra/otlp/prometheus.yml` - Prometheus scraping configuration
  - `infra/openfga/config.yml` - OpenFGA configuration
  - `docker-compose-base.yml` - Telemetry service definitions
  - `docker-compose.yml` - Development deployment configurations

#### Infrastructure Impact

- CI/CD pipelines - Telemetry backend health checks and configuration validation
- Build processes - Instrumentation verification in test environments
- Testing infrastructure - Observability for integration and performance tests
- Production deployment - Telemetry backend services and data persistence

### Dependencies

#### Added Dependencies

- `@opentelemetry/sdk-node@0.200.0` - Core OpenTelemetry Node.js SDK
- `@opentelemetry/auto-instrumentations-node@0.57.1` - Automatic instrumentation suite
- `@opentelemetry/exporter-trace-otlp-http@0.200.0` - HTTP OTLP trace exporter
- `@opentelemetry/exporter-metrics-otlp-http@0.200.0` - HTTP OTLP metrics exporter
- `@fastify/otel@0.7.0` - Fastify-specific OpenTelemetry integration

#### Infrastructure Dependencies

- OpenTelemetry Collector (otel/opentelemetry-collector-contrib:0.123.0)
- Zipkin (openzipkin/zipkin:latest) - Distributed tracing backend
- Prometheus (prom/prometheus:latest) - Metrics storage and querying

#### Nx Project Dependencies

- **Depends On**:
  - `@purrfect-sitter/database` - Database query instrumentation
  - `@purrfect-sitter/auth-repositories` - Authentication service tracing
- **Depended By**:
  - All service libraries benefit from observability instrumentation
  - Benchmark analysis tools require telemetry data
- **Implicit Dependencies**:
  - All API routes instrumented automatically
  - External service calls (Kratos, OpenFGA) traced for performance analysis

### Related ADRs

- **Supersedes**: N/A (Foundation ADR)
- **Related**: ADR-0001 (Ory Kratos Authentication) - Provides authentication service performance monitoring
- **Related**: ADR-0002 (OpenFGA Authorization) - Enables authorization strategy performance comparison
- **Influences**: Future decisions on monitoring, alerting, and performance optimization

## Implementation Notes

### Code Changes Required

- `apps/purrfect-sitter/src/instrumentation.mts` - OpenTelemetry SDK configuration with custom instrumentation
- `apps/purrfect-sitter/src/main.ts` - Instrumentation import and initialization
- `tools/scripts/trace-analyzer.ts` - Custom trace analysis for benchmark scenarios
- `tools/scripts/benchmark-auth-strategies.ts` - Authorization strategy performance comparison
- Service files with custom span creation for business logic tracing

### Configuration Changes

- `infra/otlp/collector-config.yml` - OpenTelemetry Collector pipeline configuration
- `infra/otlp/prometheus.yml` - Prometheus metrics scraping configuration
- `docker-compose-base.yml` - Telemetry service definitions and networking
- Environment variables for OTLP endpoint configuration and service identification

### Testing Strategy

- Unit tests for custom instrumentation with span verification
- Integration tests with telemetry data validation
- Performance tests measuring instrumentation overhead
- End-to-end tests verifying trace correlation across services
- Benchmark analysis validation for authorization strategy comparison

### Deployment Considerations

- Telemetry backends must be deployed before application services
- OpenTelemetry Collector requires sufficient memory and CPU allocation
- Prometheus storage configuration for telemetry data retention
- Network configuration for OTLP data transmission between services
- Monitoring and alerting for telemetry pipeline health
- Data backup and disaster recovery for observability data

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/) - Comprehensive implementation guide
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/languages/js/) - Node.js specific documentation
- [Fastify OpenTelemetry Plugin](https://github.com/fastify/fastify-otel) - Fastify integration guide
- [Zipkin Documentation](https://zipkin.io/pages/quickstart.html) - Distributed tracing backend setup
- [Prometheus Documentation](https://prometheus.io/docs/) - Metrics collection and storage
- **Git References**:
  - Instrumentation configuration: `apps/purrfect-sitter/src/instrumentation.mts`
  - Telemetry infrastructure: `infra/otlp/`
  - Benchmark analysis: `tools/scripts/trace-analyzer.ts`
- **Issue References**: Performance optimization requirements, observability compliance

---

**ADR Correlation Tags**: `#area-devops`, `#tool-opentelemetry`, `#tool-zipkin`, `#tool-prometheus`, `#tool-fastify`, `#pattern-observability`, `#pattern-microservice`, `#impact-high`, `#component-purrfect-sitter`, `#performance-monitoring`, `#debugging-distributed`
