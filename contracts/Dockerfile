# syntax=docker/dockerfile:1
#
# Local Polygon-compatible chain: a Hardhat node with the AgriSupplyChain
# contract deployed and seeded. This exists so `docker compose up` gives you a
# working blockchain without anyone installing Hardhat by hand.

FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache tini curl

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json hardhat.config.ts ./
COPY contracts ./contracts
COPY scripts ./scripts
COPY test ./test
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Compiling at build time means container start is just "boot the node".
RUN npx hardhat compile && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8545

HEALTHCHECK --interval=10s --timeout=4s --start-period=30s --retries=10 \
  CMD curl -fsS -X POST -H 'Content-Type: application/json' \
      --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      http://127.0.0.1:8545 || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
