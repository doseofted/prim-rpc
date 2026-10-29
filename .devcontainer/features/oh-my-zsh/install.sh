#!/usr/bin/env bash
# The base image already lists plugins=(git). Add node, which ships with
# Oh My Zsh, pnpm completion, and Starship. Skip when Oh My Zsh is absent.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

USER_NAME="${USERNAME:-vscode}"
USER_HOME="$(getent passwd "${USER_NAME}" | cut -d: -f6)"
ZSHRC="${USER_HOME}/.zshrc"
OMZ="${USER_HOME}/.oh-my-zsh"
NVM_DIR="${NVM_DIR:-/usr/local/share/nvm}"

if [ ! -f "${ZSHRC}" ] || [ ! -d "${OMZ}/plugins/node" ]; then
	echo "Oh My Zsh is not installed; skipping plugin setup."
	exit 0
fi

apt-get update
apt-get install -y --no-install-recommends starship
rm -rf /var/lib/apt/lists/*
su "${USER_NAME}" -c "mkdir -p '${USER_HOME}/.config' && starship preset pure-preset -o '${USER_HOME}/.config/starship.toml'"

sed -i 's/^plugins=(git)$/plugins=(git node pnpm)/' "${ZSHRC}"
sed -i 's/^ZSH_THEME=.*/ZSH_THEME=""/' "${ZSHRC}"
printf '\neval "$(starship init zsh)"\n' >> "${ZSHRC}"

completion="${OMZ}/custom/plugins/pnpm/pnpm.plugin.zsh"
mkdir -p "$(dirname "${completion}")"
su "${USER_NAME}" -c "export COREPACK_ENABLE_DOWNLOAD_PROMPT=0; . '${NVM_DIR}/nvm.sh'; nvm use default >/dev/null; pnpm completion zsh" > "${completion}"
chown -R "${USER_NAME}:${USER_NAME}" "${OMZ}/custom/plugins/pnpm" "${ZSHRC}" "${USER_HOME}/.config/starship.toml"
