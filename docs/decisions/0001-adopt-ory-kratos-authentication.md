# ADR-0001: Adopt Ory Kratos for Identity and Authentication Management

## Metadata
- **Date**: 2025-01-23
- **Status**: Accepted
- **Deciders**: [@getlarge]
- **Technical Area**: Backend
- **Impact Level**: Critical
- **Affected Nx Projects**: @purrfect-sitter/auth-middlewares, @purrfect-sitter/auth-repositories, purrfect-sitter, @purrfect-sitter/users-repositories

## Context

### Problem Statement
The Purrfect Sitter application requires a robust, secure, and scalable authentication system to manage user identities, handle self-service flows (registration, login, password recovery, account settings), and integrate seamlessly with the authorization layer. The system must support modern authentication patterns while being maintainable, compliant with security best practices, and capable of scaling from development to production without vendor lock-in.

### Technical Environment

**Repository**: https://github.com/getlarge/purrfect-sitter.git  
**Branch**: main  
**Recent Commits** (for file path validity):
- a0eff99: chore: add rules for nx console AI agent generation and update .gitignore
- d161152: feat: add tag query for benchmark run ID in trace fetching  
- 0689dda: feat: enhance benchmarking with additional headers and detailed iteration metrics
- cd5e18a: feat: improve trace analysis with detailed scenario metrics and reporting
- 6ffa836: feat: add trace analyzer for OpenTelemetry data analysis and performance metrics reporting

**Relevant Commits** (authentication/authorization context):
- a455d9d: feat: create auth middlewares and repositories
- 23813fb: fix: improve auth middlewares
- c7b8c71: fix: update session authentication to handle missing cookie or token
- f624802: fix: add collector service dependency and configure tracing settings for Ory Kratos

**Nx Workspace**: 
- 13 libraries across domains with dedicated auth middleware and repositories
- TypeScript monorepo using Nx 20.7.2 with ESM support
- Fastify-based backend with plugin architecture
- OpenTelemetry instrumentation for observability

**Core Dependencies**:
- `@ory/kratos-client@1.3.8` - Official Kratos TypeScript client
- `fastify@5.2.1` - Web framework with session/cookie support
- `@fastify/cookie@11.0.2` - Cookie handling for session management
- `drizzle-orm@0.41.0` - Database ORM for user data storage
- `@opentelemetry/*` - Performance monitoring and tracing

### Constraints and Requirements
- **Security Requirements**: GDPR compliance, secure password handling, session management, protection against common attacks (CSRF, session fixation, etc.)
- **Performance Requirements**: Authentication checks must complete within 50ms, session validation under 10ms
- **Compatibility Requirements**: Must integrate with Fastify middleware, support both cookie and token-based authentication
- **Operational Requirements**: Self-hosted deployment capability, managed service option for production, comprehensive audit logging
- **User Experience Requirements**: Self-service registration, login, password recovery, account settings management

### Alternatives Considered

1. **Auth0 (SaaS Solution)**
   - Pros: 
     - Fully managed service with extensive features
     - Rich ecosystem and integrations
     - Comprehensive compliance certifications
     - Advanced features like MFA, social login, enterprise connections
   - Cons:
     - Vendor lock-in with proprietary APIs
     - High costs at scale (per MAU pricing)
     - Limited customization for self-service flows
     - Data residency concerns for sensitive applications
     - Complex pricing model with feature restrictions

2. **Firebase Authentication**
   - Pros:
     - Easy integration with Google ecosystem
     - Client-side SDKs for web and mobile
     - Built-in social login providers
     - Generous free tier
   - Cons:
     - Google vendor lock-in
     - Limited customization of authentication flows
     - Not suitable for backend-first applications
     - Limited control over user data and schemas
     - Requires Google Cloud Platform commitment

3. **Supabase Auth**
   - Pros:
     - Open-source with managed hosting option
     - PostgreSQL-based with direct database access
     - Built-in row-level security (RLS)
     - Modern developer experience
   - Cons:
     - Relatively new with smaller ecosystem
     - Primarily designed for full Supabase stack adoption
     - Limited enterprise features
     - Less mature than established solutions

4. **Custom Authentication System**
   - Pros:
     - Complete control over implementation
     - No external dependencies
     - Custom business logic integration
     - No licensing costs
   - Cons:
     - High development and maintenance overhead
     - Security implementation complexity
     - Compliance burden (GDPR, password policies, etc.)
     - Need to implement all authentication flows from scratch
     - High risk of security vulnerabilities

5. **Ory Kratos (Chosen Solution)**
   - Pros:
     - Open-source with Apache 2.0 license, avoiding vendor lock-in
     - Security-first design based on modern standards
     - Self-hosted deployment with optional managed service (Ory Network)
     - Comprehensive self-service flows out of the box
     - Excellent documentation and active community
     - Battle-tested by companies like OpenAI (migrating from Auth0)
     - Cloud-native architecture with Kubernetes-ready deployment
     - GDPR compliant with built-in privacy features
   - Cons:
     - Learning curve for Kratos concepts and configuration
     - Additional infrastructure dependency
     - Less extensive third-party ecosystem compared to Auth0
     - Requires understanding of identity schema design

## Decision

### Chosen Solution
We will adopt Ory Kratos as our identity and authentication management system, leveraging its open-source foundation with the option to use Ory Network managed services for production workloads.

### Implementation Approach
1. **Self-Service Identity Management**: Configure Kratos for registration, login, recovery, verification, and settings flows
2. **Schema-Driven Architecture**: Define user identity schema with email and display name as core traits
3. **Multi-Environment Setup**: Development with local Docker, production-ready with optional managed service
4. **Session Management**: Cookie-based sessions for web clients with Bearer token support for APIs
5. **Integration Architecture**: Fastify middleware for session validation, TypeScript client for admin operations
6. **Observability**: OpenTelemetry tracing integration for authentication performance monitoring

### Success Criteria
- User registration and login flows complete within 2 seconds end-to-end
- Session validation middleware processes requests under 10ms
- Zero authentication-related security vulnerabilities in security audits
- Seamless integration with authorization layer (OpenFGA)
- Support for 10,000+ concurrent authenticated users
- 99.9% authentication service uptime

## Consequences

### Positive Impacts
- **Vendor Independence**: Open-source solution eliminates vendor lock-in risks
- **Security Best Practices**: Battle-tested security implementation following OWASP guidelines
- **Cost Efficiency**: No per-user pricing, predictable infrastructure costs
- **Flexibility**: Full control over authentication flows and user experience
- **Industry Validation**: Proven by OpenAI's migration from Auth0 to Ory Kratos
- **Compliance Ready**: Built-in GDPR compliance features and audit logging
- **Production Scaling**: Option to use Ory Network managed service removes operational burden
- **Developer Experience**: Excellent documentation and TypeScript support

### Negative Impacts
- **Operational Complexity**: Additional service to deploy, monitor, and maintain
- **Learning Curve**: Team needs to understand Kratos architecture and configuration
- **Integration Effort**: More complex initial setup compared to SaaS solutions
- **Limited Ecosystem**: Fewer pre-built integrations compared to established SaaS providers

### Risks and Mitigation
- **Risk**: Kratos service unavailability impacts user authentication
  - **Likelihood**: Low
  - **Impact**: Critical  
  - **Mitigation**: High-availability deployment, health checks, fallback strategies, monitoring with alerts

- **Risk**: Configuration errors lead to security vulnerabilities
  - **Likelihood**: Medium
  - **Impact**: High
  - **Mitigation**: Configuration validation, security reviews, automated testing of auth flows, regular security audits

- **Risk**: Performance bottlenecks with Kratos external calls
  - **Likelihood**: Low
  - **Impact**: Medium
  - **Mitigation**: Session caching, performance monitoring, local deployment options, connection pooling

- **Risk**: Team knowledge gap on Kratos administration
  - **Likelihood**: Medium
  - **Impact**: Medium
  - **Mitigation**: Comprehensive documentation, team training, gradual rollout, expert consultation when needed

### Follow-up Actions
- [x] Configure Kratos base configuration and identity schemas
- [x] Set up Docker Compose development environment
- [x] Implement Fastify session middleware integration
- [x] Create authentication repository with Kratos client
- [ ] Set up production Kratos deployment or Ory Network integration
- [ ] Implement comprehensive authentication flow testing
- [ ] Configure monitoring and alerting for authentication metrics
- [ ] Create team documentation and operational runbooks
- [ ] Security audit of authentication implementation

## Technical Context

### Affected Components
#### Primary Impact
- `libs/auth/middlewares/` - Session validation and authentication middleware
- `libs/auth/repositories/` - Kratos client integration and admin operations
- `apps/purrfect-sitter/src/app/plugins/auth-config.ts` - Authentication plugin configuration

#### Secondary Impact  
- `apps/purrfect-sitter/src/app/plugins/session.ts` - Session management plugin
- `apps/purrfect-sitter/src/app/routes/` - Route-level authentication requirements
- `libs/users/repositories/` - User data synchronization with Kratos identities
- Configuration files:
  - `infra/ory-kratos/` - Kratos server configuration and schemas
  - `docker-compose-base.yml` - Kratos service definitions
  - Environment variables for Kratos endpoints and credentials

#### Infrastructure Impact
- CI/CD pipelines - Kratos service health checks and migration verification
- Build processes - Authentication flow testing in CI environment
- Testing infrastructure - Integration tests requiring Kratos service
- Production deployment - Kratos service deployment and database migration

### Dependencies
#### Added Dependencies
- `@ory/kratos-client@1.3.8` - Official TypeScript client for Kratos API
- `@fastify/cookie@11.0.2` - Enhanced cookie handling for sessions

#### Infrastructure Dependencies
- Kratos service (oryd/kratos:v1.3.1) with PostgreSQL backend
- Kratos Self-Service UI (oryd/kratos-selfservice-ui-node:v1.3.0)
- Mail service (mailslurper for development, SMTP for production)

#### Nx Project Dependencies
- **Depends On**: 
  - `@purrfect-sitter/database` - User data storage and synchronization
  - `@purrfect-sitter/models` - User DTOs and type definitions
- **Depended By**: 
  - `@purrfect-sitter/auth-middlewares` - Authorization middleware requires authentication
  - All service libraries requiring user context
- **Implicit Dependencies**: 
  - All API routes requiring authentication
  - OpenTelemetry tracing for authentication metrics

### Related ADRs
- **Supersedes**: N/A (Foundation ADR)
- **Related**: Future ADRs on frontend authentication integration
- **Influences**: ADR-0002 (OpenFGA Authorization Strategy) - Kratos provides user identity for authorization

## Implementation Notes

### Code Changes Required
- `libs/auth/repositories/src/lib/auth.ts` - Kratos client configuration and helper functions
- `libs/auth/middlewares/src/lib/session.middleware.ts` - Session validation middleware
- `apps/purrfect-sitter/src/app/plugins/auth-config.ts` - Fastify plugin for auth configuration
- `apps/purrfect-sitter/src/app/plugins/session.ts` - Session management plugin
- Route handlers requiring authentication decorators

### Configuration Changes
- `infra/ory-kratos/kratos.base.yml` - Base Kratos configuration
- `infra/ory-kratos/kratos.dev.yml` - Development-specific overrides
- `infra/ory-kratos/identity-schemas/user.schema.json` - User identity schema
- `docker-compose-base.yml` - Kratos service definitions and dependencies
- Environment variables for Kratos URLs and database connections

### Testing Strategy
- Unit tests for authentication middleware with mocked Kratos responses
- Integration tests with real Kratos service covering all self-service flows
- End-to-end tests for complete authentication user journeys
- Performance tests for session validation under load
- Security tests for common authentication vulnerabilities (CSRF, session fixation, etc.)

### Deployment Considerations
- Kratos database migration must complete before application deployment
- Kratos service health checks required for deployment readiness
- SMTP configuration for production email delivery
- TLS certificates for production Kratos endpoints
- Session cookie domain configuration for production environments
- Backup and disaster recovery procedures for identity data

## References
- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos) - Comprehensive implementation guide
- [Kratos GitHub Repository](https://github.com/ory/kratos) - Source code and issue tracking  
- [OpenAI Case Study](https://ory.sh/customers/openai) - Real-world migration from Auth0 to Kratos
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) - Security best practices
- [Ory Network](https://www.ory.sh/network) - Managed service option for production
- **Git References**: 
  - Kratos configuration: `infra/ory-kratos/`
  - Authentication middleware: `libs/auth/middlewares/`
  - Docker setup: `docker-compose-base.yml`
- **Issue References**: Security compliance requirements, scalability planning

---
**ADR Correlation Tags**: `#area-backend`, `#tool-ory-kratos`, `#tool-fastify`, `#tool-docker`, `#pattern-authentication`, `#pattern-microservice`, `#impact-critical`, `#component-auth-middlewares`, `#component-auth-repositories`, `#security-identity`, `#compliance-gdpr`