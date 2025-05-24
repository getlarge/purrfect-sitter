# ADR-0002: Adopt OpenFGA for Fine-Grained Authorization

## Metadata
- **Date**: 2025-01-23
- **Status**: Accepted
- **Deciders**: [@getlarge]
- **Technical Area**: Backend
- **Impact Level**: High
- **Affected Nx Projects**: @purrfect-sitter/auth-middlewares, @purrfect-sitter/auth-repositories, purrfect-sitter, @purrfect-sitter/cats-services, @purrfect-sitter/cat-sittings-services, @purrfect-sitter/reviews-services, @purrfect-sitter/cats-repositories, @purrfect-sitter/cat-sittings-repositories, @purrfect-sitter/reviews-repositories

## Context

### Problem Statement
The Purrfect Sitter application requires a sophisticated authorization system to manage complex relationships between users, cats, cat sittings, and reviews. The authorization logic involves temporal conditions (active vs pending sittings), nested resource relationships (cat owners can review sitters only after completed sittings), and role-based permissions (system admins). A traditional database-query approach becomes increasingly complex and error-prone as these relationships grow.

### Technical Environment

**Repository**: https://github.com/getlarge/purrfect-sitter.git  
**Branch**: main  

**Recent Commits** (for file path validity):
- a0eff99: chore: add rules for nx console AI agent generation and update .gitignore
- d161152: feat: add tag query for benchmark run ID in trace fetching  
- 0689dda: feat: enhance benchmarking with additional headers and detailed iteration metrics
- cd5e18a: feat: improve trace analysis with detailed scenario metrics and reporting
- 6ffa836: feat: add trace analyzer for OpenTelemetry data analysis and performance metrics reporting

**Relevant Commits** (authorization context):
- 9fbb979: feat: add performance benchmarking tools for authorization strategies
- 117ef7a: fix: update default auth strategy to 'openfga' and add strategy attribute to span processors
- 02430b6: fix: update OpenFGA strategy and authorization relationships for cat_sitting and reviews
- da85a43: feat: add authorization tests for cat sitting, cats, and reviews resources
- ca6c867: feat: configure OpenFGA with tracing settings and add configuration file

**Nx Workspace**: 
- 13 libraries across domains (auth, cats, cat-sittings, reviews, users, database, models)
- TypeScript monorepo using Nx 20.7.2
- SWC build tooling with esbuild for production
- Built-in authorization middleware in `@purrfect-sitter/auth-middlewares`

**Core Dependencies**:
- `@openfga/sdk@0.8.0` - OpenFGA client integration
- `@ory/kratos-client@1.3.8` - User authentication
- `fastify@5.2.1` - Web framework with plugin architecture
- `drizzle-orm@0.41.0` - Database ORM
- `@opentelemetry/*` - Performance monitoring and tracing

### Constraints and Requirements
- **Performance Requirements**: Authorization checks must complete within 100ms for typical scenarios
- **Security Requirements**: Fine-grained permissions for resource access, temporal access controls, role inheritance
- **Compatibility Requirements**: Must integrate with existing Fastify middleware and Ory Kratos authentication
- **Resource Constraints**: OpenFGA service must be manageable in development and production environments

### Alternatives Considered

1. **Database Query Strategy (Current Baseline)**
   - Pros: 
     - Direct database queries with full ORM integration
     - No additional service dependencies
     - Simpler deployment and debugging
     - Immediate consistency with application data
   - Cons: 
     - Complex nested queries for relationship-based permissions
     - Authorization logic scattered across service layers
     - Difficult to audit and modify permission models
     - Poor performance scaling with complex authorization rules

2. **OpenFGA Strategy (Proposed)**
   - Pros:
     - Declarative authorization model using Zanzibar-style relations
     - Built-in support for temporal conditions and contextual checks
     - Centralized permission model easy to audit and modify
     - Excellent performance with caching and optimization
     - Battle-tested Google Zanzibar approach
   - Cons:
     - Additional service dependency (OpenFGA server)
     - Learning curve for FGA modeling syntax
     - Potential latency from external service calls
     - Data consistency considerations between app and FGA store

3. **CASL (Code-Based Authorization)**
   - Pros:
     - JavaScript-native authorization rules
     - Type-safe permission definitions
     - No external dependencies
   - Cons:
     - Complex rule definitions for nested relationships
     - Limited scalability for complex scenarios
     - Manual implementation of temporal logic

## Decision

### Chosen Solution
We will adopt OpenFGA as our primary authorization strategy while maintaining the database strategy as a fallback option. The system will support both strategies through a configurable middleware architecture.

### Implementation Approach
1. **Dual Strategy Architecture**: Implement both OpenFGA and database strategies with runtime switching capability
2. **Authorization Model**: Define comprehensive FGA model covering all resources (users, cats, cat_sittings, reviews, system)
3. **Middleware Integration**: Create Fastify plugin that abstracts authorization strategy selection
4. **Performance Monitoring**: Implement OpenTelemetry tracing for both strategies to enable continuous performance comparison
5. **Gradual Migration**: Deploy with database strategy as default, progressively enable OpenFGA for specific resources

### Success Criteria
- Authorization checks complete within 100ms for 95% of scenarios
- OpenFGA model passes all defined test scenarios in `store.fga.yml`
- Performance benchmarks show OpenFGA competitive with or superior to database strategy
- Zero security regressions during migration
- Comprehensive test coverage for all authorization scenarios

## Consequences

### Positive Impacts
- **Maintainability**: Centralized, declarative authorization model reduces code complexity
- **Auditability**: Clear permission relationships in FGA model format
- **Scalability**: OpenFGA optimizations handle complex authorization scenarios efficiently  
- **Flexibility**: Easy to modify permission models without code changes
- **Performance**: Benchmarks show competitive performance with database strategy
- **Best Practices**: Adopts industry-standard Zanzibar authorization approach

### Negative Impacts
- **Complexity**: Additional service dependency increases operational overhead
- **Learning Curve**: Team needs to learn FGA modeling concepts and syntax
- **Development Overhead**: Maintaining two authorization strategies during transition
- **Latency**: Potential network latency for external authorization service calls

### Risks and Mitigation
- **Risk**: OpenFGA service availability impacts application functionality
  - **Likelihood**: Medium
  - **Impact**: High  
  - **Mitigation**: Fallback to database strategy with circuit breaker pattern, comprehensive monitoring

- **Risk**: Performance degradation with OpenFGA external calls
  - **Likelihood**: Low
  - **Impact**: Medium
  - **Mitigation**: Continuous benchmarking, caching strategies, local OpenFGA deployment options

- **Risk**: Data consistency issues between application database and FGA store
  - **Likelihood**: Medium
  - **Impact**: High
  - **Mitigation**: Transactional tuple updates, comprehensive integration tests, data validation checks

### Follow-up Actions
- [x] Implement OpenFGA authorization model (`purrfect-sitter-model.fga`)
- [x] Create comprehensive test suite (`store.fga.yml`)
- [x] Build benchmark tooling for performance comparison
- [x] Implement middleware with strategy selection
- [ ] Deploy OpenFGA service to production environment
- [ ] Configure monitoring and alerting for authorization performance
- [ ] Create team documentation and training materials
- [ ] Plan gradual migration timeline for existing deployments

## Technical Context

### Affected Components
#### Primary Impact
- `libs/auth/middlewares/` - Authorization middleware implementation
- `libs/auth/repositories/` - OpenFGA client integration
- `apps/purrfect-sitter/` - Main application with route-level authorization

#### Secondary Impact  
- `libs/cats/services/` - Cat management service authorization
- `libs/cat-sittings/services/` - Cat sitting workflow authorization
- `libs/reviews/services/` - Review system authorization
- Configuration files:
  - `docker-compose.yml` - OpenFGA service definition
  - `infra/openfga/config.yml` - OpenFGA server configuration
  - `.env` files - Strategy selection environment variables

#### Infrastructure Impact
- CI/CD pipelines - Additional OpenFGA service health checks required
- Build processes - FGA model validation in build pipeline
- Testing infrastructure - Integration test environment needs OpenFGA service

### Dependencies
#### Added Dependencies
- `@openfga/sdk@0.8.0` - OpenFGA TypeScript client
- `@openfga/syntax-transformer@0.2.0-beta.22` - FGA model transformation utilities

#### Updated Dependencies
- OpenFGA service deployment requirements
- Docker Compose service definitions

#### Nx Project Dependencies
- **Depends On**: 
  - `@purrfect-sitter/database` - Core database schema and connections
  - `@purrfect-sitter/models` - Shared DTOs and interfaces
- **Depended By**: 
  - `@purrfect-sitter/cats-services` - Cat management authorization
  - `@purrfect-sitter/cat-sittings-services` - Sitting workflow authorization  
  - `@purrfect-sitter/reviews-services` - Review system authorization
- **Implicit Dependencies**: 
  - All API route handlers require authorization middleware
  - OpenTelemetry instrumentation for performance monitoring

### Related ADRs
- **Supersedes**: N/A
- **Depends On**: ADR-0001 (Ory Kratos Authentication) - Requires user identity from authentication system
- **Influences**: Future decisions on microservice authorization patterns

## Implementation Notes

### Code Changes Required
- `libs/auth/middlewares/src/lib/strategies/openfga-strategy.ts` - OpenFGA authorization implementation
- `libs/auth/middlewares/src/lib/strategies/db-strategy.ts` - Database fallback strategy
- `libs/auth/middlewares/src/lib/authorize.middleware.ts` - Strategy selection logic
- `apps/purrfect-sitter/src/app/plugins/authorization.ts` - Fastify plugin registration
- Route files: `apps/purrfect-sitter/src/app/routes/api/*/index.ts` - Authorization decorators

### Configuration Changes
- `docker-compose.yml` - OpenFGA service definition and health checks
- `infra/openfga/config.yml` - OpenFGA server configuration
- Environment variables for strategy selection (`AUTH_STRATEGY=openfga|db`)
- `nx.json` - Build targets for FGA model validation

### Testing Strategy
- Unit tests for both authorization strategies with mocked dependencies
- Integration tests with real OpenFGA service using `store.fga.yml` test scenarios
- Performance benchmarks using `tools/scripts/benchmark-auth-strategies.ts`
- End-to-end tests covering all authorization scenarios across user types
- FGA model validation as part of CI pipeline (`yarn test:fga`)

### Deployment Considerations
- OpenFGA service must be deployed before application deployment
- Database migration may be required for role-based permissions
- Environment-specific configuration for OpenFGA endpoints
- Monitoring setup for authorization performance metrics
- Rollback plan to database strategy if OpenFGA issues occur

## References
- [OpenFGA Documentation](https://openfga.dev/docs)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/) - Foundational authorization approach
- [FGA Playground](http://localhost:3000) - Local development environment
- **Git References**: 
  - Commit 6ffa836: "feat: add trace analyzer for OpenTelemetry data analysis"
  - Commit cd5e18a: "feat: improve trace analysis with detailed scenario metrics"
  - Authorization model: `purrfect-sitter-model.fga`
  - Test scenarios: `store.fga.yml`
- **Issue References**: Performance optimization and security audit requirements

---
**ADR Correlation Tags**: `#area-backend`, `#tool-openfga`, `#tool-fastify`, `#pattern-authorization`, `#pattern-microservice`, `#impact-high`, `#component-auth-middlewares`, `#component-purrfect-sitter`, `#performance-critical`, `#security-rbac`