# Prim Restructure

So far I've restructured the major parts of the project. There is still quite a bit to do though. It might be easier
to reference here while I'm actively working on it than put in a separate app:

- Add back Taskfiles but, this time, create them for each project and include in main Taskfile
  - Where it makes sense, use TurboRepo run commands within main Taskfile
  - Create tasks for not just running JavaScript project but also individual Docker containers
  - Add back common development-related tasks to misc folder
- Add back Docker configuration but this time use a single Dockerfile for development and production to reduce repetition.
  - Make sure source/dist folders are synced volumes to keep development with containers easy
  - Base image should include libs/** and  ui/** (but this image should not be pushed anywhere)
  - Image size in development will be large (mostly dev node_modules) but with production settings, the image should be much smaller without needing to create an entirely separate configuration
  - Consider creating Compose files for each project and referencing them in `COMPOSE_FILE` to avoid having all project configuration in one single Compose file (not sure yet if this would be more or less messy)
- Consider using husky for git hooks and "changesets" tool (this may have to be done later, not really critical)
- Search for all added `eslint-disable` in files and try resolving each issue, otherwise lax the rules a bit (they're nearly impossible to follow now)


There are probably a few things I left out. Scan over the "old-structure" folder to ensure everything needed is there.
