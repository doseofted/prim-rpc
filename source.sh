#!/bin/bash

# REFERENCE: https://stackoverflow.com/a/17744637
PROJECT_DIR=$(cd -P -- "$(dirname -- "$0")" && pwd -P)
cd $PROJECT_DIR

# REFERENCE: https://gist.github.com/mihow/9c7f559807069a03e302605691f85572#gistcomment-3225272
setenv () {
  local file=$([ -z "$1" ] && echo ".env" || echo ".env.$1")
  if [[ -f $file ]]; then
    set -a; source $file; set +a
    # export $(cat $file | sed 's/#.*//g' | xargs)
  else
    echo "No $file file found" 1>&2
    return 1
  fi
}
setenv

dc () {
  local dcdev=("-f" "${PROJECT_DIR}/docker-compose.yml" "-f" "${PROJECT_DIR}/docker-compose.dev.yml")
  local dcprod=("-f" "${PROJECT_DIR}/docker-compose.yml" "-f" "${PROJECT_DIR}/docker-compose.prod.yml")
  if [[ "$ENV_COMPOSE" == "development" ]]; then
    ENV_TO_USE=$dcdev
  else
    ENV_TO_USE=$dcprod
  fi
  eval "docker-compose ${ENV_TO_USE[@]} $@"
}

drun () {
  local given_args="${@:2}"
  local run_this="${given_args:-bash}"
  eval "dc run --entrypoint='' $1 $run_this"
}

dex () {
  local given_args="${@:2}"
  local run_this="${given_args:-bash}"
  eval "dc exec $1 $run_this"
}

# Basic aliases
alias dc-logs="dc logs -f --tail=50"
alias dc-up="dc up --build -d"
alias dc-down="dc down -v --remove-orphans -t 10"
