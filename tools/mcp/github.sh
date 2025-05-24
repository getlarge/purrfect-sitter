#!/bin/bash
# trick to configure the MCP https://github.com/anthropics/claude-code/issues/916

# Use environment variable if set (for CI), otherwise fallback to gh auth token (for local)
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  export GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token)
fi

docker run --rm -i -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server
