#!/bin/bash

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
  local dcdev=("-f" "docker-compose.yml" "-f" "docker-compose.dev.yml")
  local dcprod=("-f" "docker-compose.yml" "-f" "docker-compose.prod.yml")
  if [[ "$ENV_COMPOSE" == "development" ]]; then
    ENV_TO_USE=$dcdev
  else
    ENV_TO_USE=$dcprod
  fi
  eval "docker-compose ${ENV_TO_USE[@]} $@"
}

# Basic aliases
# alias sudo="sudo bash -c"
alias dex="dc exec"

# More specific situations
alias dc-logs="dc logs -f --tail=50"
alias dc-up="dc up --build -d"
alias dc-down="dc down -v --remove-orphans -t 10"
