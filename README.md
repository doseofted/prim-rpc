# Prim

Not a headless CMS but better. A place to structure and handle data. The administration interface is your app.

## Get Started

To start the project easily, use aliases: `source source.sh`. Reference the following commands for development.

Command | Description
--- | ---
`dcdev-up` | Start project in background, development mode
`dcdown` | Stop running project in development mode, also remove anonymous volumes and containers no longer in use.
`dcdev-logs` | Tail latest logs from containers, Ctrl-C to stop tailing
`dex-dev <container_name> <command>` | Run command in running container, for example `dex api yarn` will run execute `yarn` in `api` container.

In production, use `dcprod` instead of `dcdev`. See `source.sh` for expansions. Generally, commands start with `dc` representing `docker-compose`.

## Reference

Note that Docker Compose is aliased to `dc` when sourcing this project (`source source.sh`). Commands below assume aliases have been configured.

Alias | Description
--- | ---
`dc` | Docker Compose
`dcdev` | Run Docker Compose in a development environment. Don't run in production.
`dcprod` | Run Docker Compose in a production environment.
`dexdev <container_name> <command>` | Run command in running container, for example `dc exec api yarn` will run execute `yarn` in `api` container.
