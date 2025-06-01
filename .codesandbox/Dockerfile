# CodeSandbox uses a slightly different approach than VS Code devcontainers
# This Dockerfile is optimized for CodeSandbox environments

FROM node:20-slim

# Install essential packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    postgresql-client \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install OpenFGA CLI
RUN curl -L https://github.com/openfga/cli/releases/latest/download/fga_Linux_x86_64.tar.gz | tar -xz \
    && mv fga /usr/local/bin/fga \
    && chmod +x /usr/local/bin/fga

# Create workspace directory
WORKDIR /workspace

# Install global npm packages
RUN npm install -g nx@latest

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Expose ports
EXPOSE 3333 8080 8082

# Set environment variables
ENV DATABASE_URL=postgresql://dbuser:secret@localhost:5432/purrfect-sitter
ENV OPENFGA_API_URL=http://localhost:8080
ENV FGA_API_URL=http://localhost:8080

# Entry point
CMD ["sh", "-c", "npm run dev"]