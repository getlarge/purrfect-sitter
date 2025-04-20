FROM node:22-alpine AS base

FROM base AS runner
WORKDIR /app

COPY *.json eslint.config.mjs ./
COPY apps ./apps
COPY libs ./libs

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 app

# installing from the apps/purrfect-sitter package.json is not working - dependencies are not installed
# RUN npm i --prefix apps/purrfect-sitter --omit=dev
RUN npm i --omit=dev

RUN chown -R app:nodejs /app
USER app

CMD ["node", "apps/purrfect-sitter/dist/main.js"]

EXPOSE 3000
