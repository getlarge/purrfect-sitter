.PHONY: build-test-image start-e2e-services stop-e2e-services e2e-test-db e2e-test-openfga e2e-test-all

# Build test Docker image
build-test-image:
	npx nx container purrfect-sitter --configuration=test

# Start E2E test environment
start-e2e-services: stop-dev
	docker compose -f docker-compose-ci.yml up -d

# Stop E2E test environment
stop-e2e-services:
	docker compose -f docker-compose-ci.yml down

# Run E2E tests with DB auth strategy
e2e-test-db:
	AUTH_STRATEGY=db npx nx e2e purrfect-sitter-e2e

# Run E2E tests with OpenFGA auth strategy
e2e-test-openfga:
	AUTH_STRATEGY=openfga npx nx e2e purrfect-sitter-e2e

# Run all E2E tests
e2e-test-all: e2e-test-db e2e-test-openfga

# Start development environment
start-dev: stop-e2e-services
	docker compose --profile dev up -d

# Stop development environment
stop-dev:
	docker compose --profile dev down

# Reset test environment
reset-test: stop-e2e-services start-e2e-services

# Full E2E test workflow
e2e-full: build-test-image reset-test e2e-test-all

# Execute DB migrations
migrate:
	npx nx run purrfect-sitter:migrate
