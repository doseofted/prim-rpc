#!/bin/bash

# REFERENCE: https://stackoverflow.com/a/17744637
PROJECT_DIR=$(cd -P -- "$(dirname -- "$0")" && pwd -P)
cd $PROJECT_DIR

testdns () {
  if [[ $(uname -s) == 'Linux' ]]; then
    echo "Disabling resolved ..."
    sudo sed -i 's/nameserver 127.0.0.53/nameserver 127.0.0.1/g' /etc/resolv.conf
    sudo systemctl stop systemd-resolved.service
  fi
  docker run -it --rm \
    --name coredns \
    -v "${PROJECT_DIR}/dev.Corefile:/root/Corefile" \
    -p 53:53/tcp -p 53:53/udp \
    -e "DNS_BIND=${1:-127.0.0.1}" \
    coredns/coredns:1.8.4 \
    -conf /root/Corefile
  if [[ $(uname -s) == 'Linux' ]]; then
    echo "Re-enabling resolved ..."
    sudo systemctl start systemd-resolved.service
    sudo sed -i 's/nameserver 127.0.0.1/nameserver 127.0.0.53/g' /etc/resolv.conf
  fi
}

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
