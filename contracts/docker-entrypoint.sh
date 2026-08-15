#!/bin/sh
# Boots the dev chain, deploys AgriSupplyChain, seeds a few batches, then stays
# in the foreground as the node process.
#
# Deployment happens *after* the node is up rather than in the image build,
# because a Hardhat node's state is in-memory: a contract deployed at build time
# would not exist when the container starts.
set -eu

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
export RPC_URL

echo "▸ starting hardhat node on 0.0.0.0:8545"
npx hardhat node --hostname 0.0.0.0 --port 8545 &
NODE_PID=$!

# Forward termination to the node so `docker stop` is not a 10-second wait.
trap 'kill -TERM "$NODE_PID" 2>/dev/null || true; wait "$NODE_PID" 2>/dev/null || true' TERM INT

echo "▸ waiting for the RPC endpoint"
i=0
until curl -fsS -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "✗ RPC never came up" >&2
    kill -TERM "$NODE_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done
echo "▸ RPC is live"

echo "▸ deploying AgriSupplyChain"
npx hardhat run scripts/deploy.ts --network localhost

if [ "${SKIP_SEED:-false}" != "true" ]; then
  echo "▸ seeding demo batches"
  # A failed seed should not take the chain down — the contract is already live
  # and usable, and the API seeds its own off-chain data separately.
  npx hardhat run scripts/seed.ts --network localhost || echo "⚠ seeding failed, continuing"
fi

echo "▸ dev chain ready — deployment written to /app/deployments"
wait "$NODE_PID"
