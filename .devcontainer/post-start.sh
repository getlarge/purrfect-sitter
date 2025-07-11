#!/bin/zsh
set -e

echo "🔄 Starting PurrfectSitter development environment..."

# if [ -f ~/.zshrc ]; then
#   source ~/.zshrc
# fi

if [ -n "$FGA_STORE_ID" ]; then
  echo "📌 OpenFGA Store ID: $FGA_STORE_ID"
  export FGA_API_URL=http://openfga:8080
fi

echo ""
echo "✅ Environment ready!"
echo ""
echo "🚀 Quick commands:"
echo "  nx serve purrfect-sitter     - Start the API server"
echo "  nx test purrfect-sitter      - Run unit tests"
echo "  yarn test:fga                - Test OpenFGA model"
echo "  fga query check              - Test OpenFGA permissions"
echo ""
echo "📚 Documentation:"
echo "  - OpenFGA Playground: http://localhost:8082"
echo "  - API Docs: http://localhost:3333/docs"
