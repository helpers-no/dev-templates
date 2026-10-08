# Build context is this folder (services/<name>/): the Red Cross platform builds with exactly that
# context, and UIS (GitHub Actions) builds the same way. Listens on port 3000.
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev

COPY app/server.js ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]
