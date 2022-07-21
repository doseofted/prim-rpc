# Prim Restructure

So far I've restructured the major parts of the project. There is still quite a bit to do though. It might be easier
to reference here while I'm actively working on it than put in a separate todo app:

- Set up an "entrypoint" script that will build/watch all `libs/*` and `ui/*` folders for use with Docker Compose
  - Also consider swapping out `CMD` in Dockerfile with entrypoint to keep container open (or keep `/bin/bash` and replace in Compose config)
- Delete `old-structure` once verified important parts of old structure are present in new structure
- Go through frontend and backend and make them actually run in container (but remember that they should be able to be ran outside of a container if needed as well)

Todo after restructure:

- Consider using husky for git hooks and "changesets" tool (this may have to be done later, not really critical)
- Search for all added `eslint-disable` in files and try resolving each issue, otherwise lax the rules a bit (they're nearly impossible to follow now)
