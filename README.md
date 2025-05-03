# Purrfect Sitter

A cat sitting management application with dual authorization strategies.

## Architecture

### Core Application

- Fastify-based API
- User authentication with Ory Kratos
- Core models: User, Cat, CatSitting, Review
- TypeBox for JSON Schema validation
- Drizzle ORM for database access
- OpenFGA for fine-grained authorization

### NX Workspace Structure

```
apps/
  purrfect-sitter/       # Main Fastify application
  purrfect-sitter-e2e/   # End-to-end tests

libs/                    # Domain-specific libraries
  database/              # Database schema and repositories
  models/                # DTOs and validation schemas
  auth/                  # Authentication and authorization
  cats/                  # Cats domain business logic
  cat-sittings/          # Cat sittings domain business logic
  reviews/               # Reviews domain business logic
```

### Authorization Strategies

This application implements two authorization strategies that can be toggled via environment variables:

1. **Database Lookups** (`AUTH_STRATEGY=db`)

   - Traditional database queries to check permissions
   - Uses JOINs and WHERE clauses for relationship checks
   - Direct SQL conditions for time-based rules

2. **OpenFGA** (`AUTH_STRATEGY=openfga`)
   - Relationship-based authorization using OpenFGA
   - Declarative authorization model (authorization-model.fga)
   - Uses relationship tuples for permissions
   - Supports complex relationship checks with contextual tuples

Both strategies implement the same authorization rules, allowing for performance comparisons.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Nx CLI (`npm install -g nx`)

### Environment Setup

1. Start the required services:

```bash
docker compose --profile dev up -d
```

This starts:

- PostgreSQL database
- OpenFGA authorization service
- Ory Kratos identity server

2. Set environment variables:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/purrfect-sitter
KRATOS_URL=http://localhost:4433
OPENFGA_URL=http://localhost:8080
OPENFGA_STORE_ID=<store_id>
AUTH_STRATEGY=db  # or 'openfga'
```

3. Run database migrations:

```bash
npx nx run database:generate
npx nx run database:migrate
```

4. Start the development server:

```bash
npx nx run purrfect-sitter:serve
```

## API Endpoints

The API follows RESTful principles and provides the following endpoints:

### Cats

- `GET /api/cats` - List all cats
- `GET /api/cats/:id` - Get cat details
- `POST /api/cats` - Create cat profile (authenticated)
- `PUT /api/cats/:id` - Update cat profile (owner or admin)
- `DELETE /api/cats/:id` - Delete cat profile (owner or admin)

### Cat Sittings

- `GET /api/cat-sittings` - List cat sittings (filtered by permissions)
- `GET /api/cat-sittings/:id` - Get cat sitting details (owner, sitter, or admin)
- `POST /api/cat-sittings` - Create cat sitting request (authenticated)
- `PUT /api/cat-sittings/:id` - Update cat sitting (owner, sitter, or admin)
- `PUT /api/cat-sittings/:id/status` - Update cat sitting status (owner or sitter)
- `DELETE /api/cat-sittings/:id` - Delete cat sitting (owner or admin)

### Reviews

- `GET /api/reviews` - List reviews (public)
- `GET /api/reviews/:id` - Get review details (author, subject, or admin)
- `POST /api/reviews` - Create review (cat owner after completed sitting)
- `PUT /api/reviews/:id` - Update review (author only)
- `DELETE /api/reviews/:id` - Delete review (admin only)

## Testing

### Unit Testing

- Run unit tests for a specific project:
  ```bash
  npx nx test <project-name>
  ```
- Run tests with coverage:
  ```bash
  npx nx test <project-name> --coverage
  ```

### E2E Testing

This project includes comprehensive end-to-end tests that validate both authorization strategies.

#### Test Structure

E2E tests are located in the `apps/purrfect-sitter-e2e/` directory:

- `src/purrfect-sitter/` - Main test suites
  - `cats/` - Tests for cat management APIs
  - `cat-sittings/` - Tests for cat sitting APIs
  - `reviews/` - Tests for review APIs
- `src/support/` - Test utilities and setup

#### Test Environment Setup

E2E tests use a dedicated test environment with:

- Test-specific Kratos configuration
- Dedicated PostgreSQL database
- Separate OpenFGA store

#### Running E2E Tests

Run E2E tests using the Makefile commands:

```bash
# Run with database strategy
make e2e-test-db

# Run with OpenFGA strategy
make e2e-test-openfga

# Run with both strategies sequentially
make e2e-test-all
```

Or directly with Nx:

```bash
# Set strategy via environment variable
AUTH_STRATEGY=db npx nx e2e purrfect-sitter-e2e
```

## Performance Analysis

### Authorization Benchmarking

This project includes tools for benchmarking and analyzing the performance differences between database query-based authorization and OpenFGA-based authorization.

#### Benchmarking Scripts

Located in `tools/scripts/`:

- `benchmark-auth-strategies.ts` - Runs identical scenarios against both authorization strategies and captures telemetry data.

  - Creates users, cats, cat sittings, and reviews
  - Executes three scenarios:
    1. Simple case: View cat (public resource)
    2. Medium case: Cat sitting management (create, update, status changes)
    3. Complex case: Review management (nested authorization checks)
  - Automatically cleans up all created resources

- `trace-analyzer.ts` - Analyzes OpenTelemetry trace data from Zipkin:
  - Fetches traces from Zipkin API
  - Groups traces by scenario
  - Calculates performance metrics for each scenario:
    - Total execution time
    - Total transaction time (end-to-end HTTP request duration)
    - Operation count
    - Time ratio between strategies
    - Operation count ratio
  - Aggregates metrics across iterations for better analysis
  - Generates both detailed and aggregated CSV/JSON reports

#### Running Benchmark Tests

1. Ensure all services are running:

   ```bash
   make start-dev
   ```

2. Ensure the database is running and migrations are applied:

   ```bash
   npx nx run database:generate
   DATABASE_URL=postgresql://dbuser:secret@localhost:5432/purrfect-sitter npx nx run database:migrate
   ```

3. Ensure the OpenFGA model is created:

   ```bash
   npx nx run purrfect-sitter:create-auth-model
   ```

4. Start the Purrfect Sitter application:

   ```bash
   AUTH_STRATEGY=openfga npx nx run purrfect-sitter:serve:local
   ```

5. Run the benchmark script:

   ```bash
   node --experimental-strip-types tools/scripts/benchmark-auth-strategies.ts
   ```

   This script:
   - Creates test users (cat owner, cat sitter, admin)
   - Sets up necessary data (cats, cat sittings)
   - Executes multiple iterations of each scenario with headers for tracing
   - Sends HTTP requests with `X-Benchmark-Scenario` headers to identify scenarios in traces

6. Analyze the results:
   ```bash
   node --experimental-strip-types tools/scripts/trace-analyzer.ts
   ```

   This will:
   - Fetch OpenFGA traces from Zipkin
   - Calculate metrics for individual scenario iterations
   - Aggregate metrics by scenario type across iterations
   - Generate two report types:
     - `auth-comparison-[timestamp].json/.csv` - Aggregated metrics with averages
     - `auth-comparison-detailed-[timestamp].json/.csv` - Detailed per-iteration metrics

#### Visualization

- View traces in Zipkin UI (http://localhost:9411)
- Examine generated CSV/JSON reports for quantitative comparison:
  - Look at the `totalScenarioTime` field for end-to-end transaction times
  - Compare metrics between different scenario types
  - Analyze the aggregated reports for overall performance patterns
- Use the data to create charts showing performance differences between strategies
- Run benchmarks with both AUTH_STRATEGY=db and AUTH_STRATEGY=openfga to compare approaches
