# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test and Lint Commands

- Run development server: `nx serve purrfect-sitter`
- Lint: `nx lint purrfect-sitter`
- Typecheck: `nx typecheck purrfect-sitter`
- Test all: `nx test purrfect-sitter`
- Test single file: `nx test purrfect-sitter --testFile=path/to/file.spec.ts`
- E2E tests: `nx e2e purrfect-sitter-e2e`
- Test OpenFGA authorization model: `yarn test:fga`

## Environment Setup

- Docker required for dependencies (Postgres, OpenFGA)
- Start services: `docker compose --profile dev up -d`
- OpenFGA available at: `http://localhost:8080` (HTTP API), `http://localhost:3000` (playground)

## Code Style Guidelines

- TypeScript for all code with proper types (no `any` when possible)
- 2 spaces indentation with UTF-8 encoding
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- Use async/await for asynchronous code
- Follow SRP (Single Responsibility Principle)
- Use fastify-plugin pattern for plugins
- Proper error handling with fastify's error handling patterns
- Prefix interfaces with 'I' and types with 'T'
- Use PascalCase for classes/interfaces, camelCase for variables/functions
- Group imports: Node.js modules, external modules, internal modules
- Nx workspace, each component (auth, models, repositories, ...) should be contained in its own Nx project under the libs directory. These projects should NOT be buildable.

## Authentication

User authentication with Ory Kratos.

## Authorization

- Uses OpenFGA for fine-grained authorization
- Authorization model in `authorization-model.fga`
- Test store and tuples in `store.fga.yml`
- Two authorization strategies supported: database queries and OpenFGA checks
