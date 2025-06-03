#!/usr/bin/env bash

VERSION=${VERSION:-0.6.6}

ARCH=$(uname -m) && OS=$(uname -s | tr "[:upper:]" "[:lower:]")
ARCH=""
case $(uname -m) in
    i386)   ARCH="386" ;;
    i686)   ARCH="386" ;;
    x86_64) ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    arm)    dpkg --print-architecture | grep -q "arm64" && ARCH="arm64" || ARCH="arm" ;;
esac

echo "Installing OpenFGA CLI version ${VERSION} for ${OS}/${ARCH}..."
curl -L "https://github.com/openfga/cli/releases/download/v${VERSION}/fga_${VERSION}_${OS}_${ARCH}.tar.gz" | tar -xz

mv fga /usr/local/bin/fga
chmod +x /usr/local/bin/fga
