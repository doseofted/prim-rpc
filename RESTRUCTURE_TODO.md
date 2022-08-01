# Prim Restructure

So far I've restructured the major parts of the project. There is still quite a bit to do though. It might be easier
to reference here while I'm actively working on it than put in a separate todo app:

- Add back a JS "setup" task that will build all parts of project outside of containers (for building type definitions in code editor)
- Go through frontend and backend and make them actually run in container (but remember that they should be able to be ran outside of a container if needed as well)

Todo after restructure:

- Consider using husky for git hooks and "changesets" tool (this may have to be done later, not really critical)
- Search for all added `eslint-disable` in files and try resolving each issue, otherwise lax the rules a bit (they're nearly impossible to follow now)
