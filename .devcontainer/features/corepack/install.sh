#!/usr/bin/env bash
# Node 26 does not ship Corepack anymore. The Node feature also installs classic
# Yarn, and that yarn bin blocks Corepack's shims. Remove it, then let Corepack
# own them.
set -euo pipefail

NVM_DIR="${NVM_DIR:-/usr/local/share/nvm}"
USER_NAME="${USERNAME:-vscode}"

su "${USER_NAME}" -c ". '${NVM_DIR}/nvm.sh' && nvm use default && npm uninstall --global yarn && npm install --global corepack && corepack enable"
