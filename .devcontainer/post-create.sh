#!/bin/zsh
set -e

echo "🚀 Setting up PurrfectSitter development environment..."

# echo "🛠️ Configuring ZSH..."

# git clone https://github.com/powerline/fonts.git
# cd fonts
# ./install.sh
# cd .. && rm -rf fonts

# zsh -c 'git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/themes/powerlevel10k'

# TODO: add dotfiles for zsh
# cp .devcontainer/dotfiles/.zshrc ~
# cp .devcontainer/dotfiles/.p10k.zsh ~

echo "⏳ Waiting for services to be ready..."
timeout=60
elapsed=0

# while ! pg_isready -h postgres -U dbuser > /dev/null 2>&1; do
#   if [ $elapsed -gt $timeout ]; then
#     echo "❌ Timeout waiting for PostgreSQL"
#     exit 1
#   fi
#   echo "Waiting for PostgreSQL..."
#   sleep 2
#   elapsed=$((elapsed + 2))
# done
# echo "✅ PostgreSQL is ready"

elapsed=0
while ! curl -s http://openfga:8080/healthz > /dev/null 2>&1; do
  if [ $elapsed -gt $timeout ]; then
    echo "❌ Timeout waiting for OpenFGA"
    exit 1
  fi
  echo "Waiting for OpenFGA..."
  sleep 2
  elapsed=$((elapsed + 2))
done
echo "✅ OpenFGA is ready"

echo "📦 Installing dependencies..."
npm install -g @anthropic-ai/claude-code
npm install

# echo "🗄️ Running database migrations..."
# npx nx run database:migrate

echo "🔐 Setting up OpenFGA store and model..."

STORE_RESPONSE=$(fga store create --name=purrfect-sitter-dev --api-url http://openfga:8080)
export FGA_STORE_ID=$(echo $STORE_RESPONSE | jq -r '.store.id')
echo "export FGA_STORE_ID=$FGA_STORE_ID" >> ~/.zshrc
source ~/.zshrc

if [ -f "purrfect-sitter-model.fga" ]; then
  fga model write --file=purrfect-sitter-model.fga --api-url http://openfga:8080 --store-id=$FGA_STORE_ID
  echo "✅ OpenFGA model written"
fi

# Load test data if available
if [ -f "store.fga.yml" ]; then
  echo "📊 Loading test data..."
  fga model test --tests store.fga.yml --api-url http://openfga:8080 --store-id=$FGA_STORE_ID || true
fi

echo "✨ Development environment setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  - Start API server: nx serve purrfect-sitter"
echo "  - Run tests: nx test purrfect-sitter"
echo "  - Run E2E tests: nx e2e purrfect-sitter-e2e"
echo "  - Test OpenFGA model: yarn test:fga"
echo ""
echo "🔗 Service URLs:"
echo "  - API: http://localhost:3333"
echo "  - OpenFGA Playground: http://localhost:8082"
echo "  - Kratos UI: http://localhost:4455"
echo "  - Zipkin: http://localhost:9411"
echo "  - Prometheus: http://localhost:9090"
