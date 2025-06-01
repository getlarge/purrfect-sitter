FROM mcr.microsoft.com/devcontainers/typescript-node:1-22

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    postgresql-client \
    curl \
    jq \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

ENV OPENFGA_VERSION=0.6.6

RUN ARCH=$(uname -m) && OS=$(uname -s) \
    && if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi \
    && curl -L "https://github.com/openfga/cli/releases/download/v${OPENFGA_VERSION}/fga_${OPENFGA_VERSION}_${OS}_${ARCH}.tar.gz" | tar -xz \
    && mv fga /usr/local/bin/fga \
    && chmod +x /usr/local/bin/fga

USER node

WORKDIR /home/node
