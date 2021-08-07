# Prim

Not a headless CMS but better. A place to structure and handle data. The administration interface is your app.

## Reference

Note that Docker Compose is aliased to `dc` when sourcing this project (`source source.sh`). Commands below assume aliases have been configured.

Command | Description
--- | ---
`dc-dev` | Run Docker Compose in a development environment. Don't run in production.
`dc-prod` | Run Docker Compose in a production environment.
`dc exec <container_name> <command>` | Run command in running container, for example `dc exec api yarn` will run execute `yarn` in `api` container.
