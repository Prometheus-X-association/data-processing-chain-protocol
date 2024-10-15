#!/bin/bash

function cleanup {
  echo "Stopping all pnpm processes..."
  kill $(jobs -p)
}

trap cleanup SIGINT

pnpm dev --port 8887 --connector_uid "connector-initiator" &
pnpm dev --port 8888 --connector_uid "remote-connector1" &
pnpm dev --port 8889 --connector_uid "remote-connector2" &
pnpm dev --port 8890 --connector_uid "remote-connector3" &

wait
