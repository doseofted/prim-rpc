#!/bin/bash

# Basic aliases
alias sudo="sudo "
alias dc="docker-compose"
alias dcprod="dc -f docker-compose.yml -f docker-compose.prod.yml"
alias dcdev="dc -f docker-compose.yml -f docker-compose.dev.yml"
alias dexdev="dcdev exec"
alias dexprod="dcprod exec"

# More specific situations
alias dcdev-logs="dcdev logs -f --tail=50"
alias dcprod-logs="dcprod logs -f --tail=50"
alias dcdev-up="dcdev up --build -d"
alias dcprod-up="dcprod up --build -d"
alias dcdev-down="dcdev down -v --remove-orphans -t 10"
alias dcprod-down="dcprod down -v --remove-orphans -t 10"
