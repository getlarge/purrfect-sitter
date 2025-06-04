# PurrfectSitter Development Container

This devcontainer provides a complete development environment for the PurrfectSitter application with all required services.

## What's Included

- **Node.js 22 LTS** with Nx workspace support
- **PostgreSQL** databases (3 instances for app, OpenFGA, and Kratos)
- **OpenFGA** authorization server with playground
- **Ory Kratos** authentication server
- **OpenTelemetry** collector with Zipkin and Prometheus
- **Docker-in-Docker** support for additional container operations
- **Pre-configured VS Code** extensions and settings

## Getting Started

### VS Code / GitHub Codespaces

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Wait for the container to build and services to start
4. The post-create script will automatically:
   - Install dependencies
   - Run database migrations
   - Set up OpenFGA store and model
   - Load test data

### CodeSandbox

[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/github/getlarge/purrfect-sitter)

1. Click the button above to open in CodeSandbox
2. CodeSandbox will automatically detect the devcontainer configuration
3. Wait for the environment to build (first time may take a few minutes)
4. The tasks defined in `.codesandbox/tasks.json` will run automatically

## Available Services

| Service | Port | Description |
|---------|------|-------------|
| API Server | 3333 | PurrfectSitter API |
| PostgreSQL | 5432 | Main application database |
| OpenFGA HTTP | 8080 | Authorization API |
| OpenFGA Playground | 8082 | Interactive authorization testing |
| Kratos Public | 4433 | Authentication public API |
| Kratos Admin | 4434 | Authentication admin API |
| Kratos UI | 4455 | Self-service UI |
| Zipkin | 9411 | Distributed tracing |
| Prometheus | 9090 | Metrics collection |

## Quick Commands

```bash
# Start the API server
nx serve purrfect-sitter

# Run tests
nx test purrfect-sitter

# Run E2E tests
nx e2e purrfect-sitter-e2e

# Test OpenFGA model
yarn test:fga

# OpenFGA CLI examples
fga query check user:bob can_manage cat:romeo
fga tuple write user:alice owner cat:fluffy
```

## Environment Variables

The following environment variables are pre-configured:

- `DATABASE_URL`: PostgreSQL connection string
- `OPENFGA_API_URL`: OpenFGA API endpoint
- `FGA_STORE_ID`: Auto-generated OpenFGA store ID
- `KRATOS_PUBLIC_URL`: Kratos public API endpoint
- `KRATOS_ADMIN_URL`: Kratos admin API endpoint

## Troubleshooting

### Services not starting

If services fail to start, check the logs:

```bash
docker compose logs postgres
docker compose logs openfga
docker compose logs kratos
```

### Port conflicts

If you have services running on your host machine, you may need to stop them or change the port mappings in `docker-compose.yml`.

### Rebuilding the container

To rebuild the devcontainer:

1. Close VS Code
2. Delete the container: `docker compose down -v`
3. Reopen the project in VS Code and rebuild

## For Article Readers

If you're following along with the ["How to Protect Your API with OpenFGA"](../docs/articles/how-to-protect-your-api-with-openfga/README.md) article:

1. The OpenFGA Playground is available at http://localhost:8082
2. The authorization model is automatically loaded from `purrfect-sitter-model.fga`
3. Test scenarios from the article are in `store.fga.yml`
4. You can run all tests with: `yarn test:fga`

### Interactive Examples

Try these commands in the terminal to explore OpenFGA:

```bash
# Check if Bob can manage Romeo
fga query check user:bob can_manage cat:romeo --store-id=$FGA_STORE_ID

# Make Anne a sitter for cat sitting #1
fga tuple write user:anne sitter cat_sitting:1 --store-id=$FGA_STORE_ID

# Check time-based permissions
fga query check user:anne active_sitter cat_sitting:1 \
  --context='{"current_time":"2023-01-01T12:00:00Z"}' \
  --store-id=$FGA_STORE_ID
```

## Additional Resources

- [OpenFGA Documentation](https://openfga.dev/docs)
- [Nx Documentation](https://nx.dev)
- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [Dev Containers Documentation](https://containers.dev)
