#!/usr/bin/env bash

VERSION=${VERSION:-0.6.6}

ARCH=$(uname -m) && OS=$(uname -s)
if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi
curl -L "https://github.com/openfga/cli/releases/download/v${VERSION}/fga_${VERSION}_${OS}_${ARCH}.tar.gz" | tar -xz
mv fga /usr/local/bin/fga
chmod +x /usr/local/bin/fga
