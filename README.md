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

- Unit tests: `npx nx test <project-name>`
- E2E tests: `npx nx e2e purrfect-sitter-e2e`
- Test OpenFGA authorization model: `npm run test:fga`
