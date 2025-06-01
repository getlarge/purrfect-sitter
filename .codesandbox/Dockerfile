FROM node:20-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    postgresql-client \
    jq \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/openfga/cli/releases/latest/download/fga_Linux_x86_64.tar.gz | tar -xz \
    && mv fga /usr/local/bin/fga \
    && chmod +x /usr/local/bin/fga

ENV OPENFGA_VERSION=0.6.6

RUN ARCH=$(uname -m) && OS=$(uname -s) \
    && if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi \
    && curl -L "https://github.com/openfga/cli/releases/download/v${OPENFGA_VERSION}/fga_${OPENFGA_VERSION}_linux_x86_64.tar.gz" | tar -xz \
    && mv fga /usr/local/bin/fga \
    && chmod +x /usr/local/bin/fga

WORKDIR /home/node

RUN npm install -g @anthropic-ai/claude-code

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3333 8080 8082

ENV DATABASE_URL=postgresql://dbuser:secret@localhost:5432/purrfect-sitter
ENV OPENFGA_API_URL=http://localhost:8080
ENV FGA_API_URL=http://localhost:8080

# CMD ["sh", "-c", "npm run dev"]
