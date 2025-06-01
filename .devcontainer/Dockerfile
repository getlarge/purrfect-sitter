FROM mcr.microsoft.com/devcontainers/typescript-node:1-22

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    postgresql-client \
    curl \
    jq \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install OpenFGA CLI
RUN curl -L https://github.com/openfga/cli/releases/latest/download/fga_`uname -s`_`uname -m`.tar.gz | tar -xz \
    && mv fga /usr/local/bin/fga \
    && chmod +x /usr/local/bin/fga

# Install global npm packages
RUN npm install -g nx@latest

# Create workspace directory
RUN mkdir -p /workspace

# Switch to non-root user
USER vscode

# Set the default working directory
WORKDIR /workspace
