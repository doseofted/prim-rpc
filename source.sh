#!/bin/bash

# Keep a reference to the project directory so as to locate Docker Compose files used below
PROJECT_DIR=`pwd`

# Set the shell environment based on a given `.env` file
# NOTE: If env file is updated, existing shells will need to be updated by sourcing this file again
# REFERENCES:
# - https://gist.github.com/mihow/9c7f559807069a03e302605691f85572#gistcomment-3225272
# - https://stackoverflow.com/a/30969768
setenv () {
  local file=$([ -z "$1" ] && echo ".env" || echo ".env.$1")
  if [[ -f $file ]]; then
    set -a; source $file; set +a
    echo "Functions and aliases are set for $COMPOSE_ENV environment."
  else
    echo "No $file file found. Are you in the project root?" 1>&2
    return 1
  fi
}

# If environment is not set, don't continue
setenv
if [[ $? -ne 0 ]]; then
  return 1
fi

# Run Docker Compose with wanted configuration files for environment
# Additional configurations can be added here.
dc () {
  local dcdev=("-f" "${PROJECT_DIR}/docker-compose.yml" "-f" "${PROJECT_DIR}/docker-compose.dev.yml")
  local dcprod=("-f" "${PROJECT_DIR}/docker-compose.yml" "-f" "${PROJECT_DIR}/misc/logging.yml" "-f" "${PROJECT_DIR}/docker-compose.prod.yml")
  if [[ "$COMPOSE_ENV" == "development" ]]; then
    ENV_TO_USE=("${dcdev[@]}")
  else
    ENV_TO_USE=("${dcprod[@]}")
  fi
  eval "docker compose ${ENV_TO_USE[@]} $@"
}

# Run app-related commands through helpful shortcut
alias prim="pnpm frontend"
# Build libraries that are used used by backend and frontend (must be ran before starting compose config)
alias dc-libraries="dc build libraries"
# Show logs in running containers for set environment (see `dc` function above)
alias dc-logs="dc logs -f --tail=15"
# Start all services for configuration
alias dc-up="dc up --build -d"
# Stop all services for configuration (assuming already started)
alias dc-down="dc down -v --remove-orphans -t 10"

# Used with other `dc-magic commands`
dc-magic-bg () {
  devcert && dc-libraries && dc-up
}

dc-help () {
  echo "  - \`dc-up\`: rebuild services if needed"
  echo "  - \`dc-down\`: stop services"
  echo "  - \`dc-logs\`: view logs again"
  echo "  - \`dex <container> <cmd>\`: run command in running container"
  echo "  - \`dun <container> <cmd>\`: run command in one-off container"
  echo "  - \`dc-help\`: show this message again"
}

# Start Docker Compose services and immediately view logs. Ctrl-C doesn't kill the thing.
dc-magic () {
  dc-magic-bg && dc-logs
  echo "\nServices are still running.\n"
  dc-help
}

# For development. Start Docker Compose in foreground and stop all services when done with it.
dc-magic-fg () {
  dc-magic-bg && dc-logs || dc-down
}

# Run something in existing container
dex () {
  local given_args="${@:2}"
  local run_this="${given_args:-bash}"
  eval "dc exec $1 $run_this"
}

# Run something in one-time instance of container based on image
dun () {
  local given_args="${@:2}"
  local run_this="${given_args:-bash}"
  eval "dc run --entrypoint='' $1 $run_this"
}

# TODO: consider cleaning built folders
# devclean () {
#   find . -type d -name 'dist' -o -name 'node_modules' -prune
# }

# Generate a new certificate trusted by the host system (`mkcert` must be installed)
# Install guide: https://github.com/FiloSottile/mkcert#installation
devcert () {
  mkdir -p "${PROJECT_DIR}/data/server/"
  mkcert \
    -key-file "${PROJECT_DIR}/data/server/dev-key.pem" \
    -cert-file "${PROJECT_DIR}/data/server/dev-cert.pem" \
    $COMPOSE_HOST "*.$COMPOSE_HOST" localhost 127.0.0.1 ::1
}

# Containerized DNS server, to be used with `dev.Corefile` configuration.
# Example use below (serves ".test" TLDs from address starting with "192..."):
# $ testdns `hostname -I | grep -oE '192\.([0-9]{1,3}\.?)*'` test
# NOTE: on Linux, `resolved` service needs to be handled for this to work
# Regardless, the OS needs to be configured to use this DNS server once running
devdns () {
  docker pull coredns/coredns:1.8.4
  docker run -it --rm \
    --name coredns \
    -v "${PROJECT_DIR}/misc/dev.Corefile:/root/Corefile" \
    -p "${1:-127.0.0.1}:53:53/tcp" -p "${1:-127.0.0.1}:53:53/udp" \
    -e "DNS_BIND=${1:-127.0.0.1}" \
    -e "DEV_TLD=${2:-test}" \
    coredns/coredns:1.8.4 \
    -conf /root/Corefile
}
