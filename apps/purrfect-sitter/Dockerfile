FROM node:22-alpine AS base

FROM base AS runner
WORKDIR /app

COPY *.json eslint.config.mjs apps libs ./

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 app

RUN npm i --prefix purrfect-sitter --omit=dev

RUN chown -R app:nodejs /app
USER app

EXPOSE 3000

CMD ["node", "main.js"]
