# Contribution Guide

Prim+RPC depends on handlers/plugins to work with a wide variety of frameworks. These frameworks can sometimes be
difficult to integrate with when one is not familiar with the framework. Contributions for handlers/plugins or to rest
of the project are welcome!

> **Warning** It is possible that a feature is already being or has been developed or that a feature may have already
> been rejected. If you'd like to contribute to the project,
> [open an issue first](https://github.com/doseofted/prim-rpc/issues/new) and describe what change that you would like
> to make.

This guide is specific to project development and changes.

# Rules

- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)
- Contributions made to a Prim+RPC project require a [Contributor License Agreement](./CLA.md).
- All projects in this repository follow [semantic versioning](https://semver.org/).
- Every completed pull request should have an
  [associated changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md).
- All commits should include detailed messages (as a best effort).

See the [Development Guide](./README.md#development) to learn how to get started.

## Processes

> **Warning** Work In Progress

Prim+RPC's processes are given today as follows:

### Features

1. Create an issue describing new feature and await feedback from community.
2. Develop a new feature:
   1. Create a new `feature/[NAME]` branch off of `develop`.
   2. Make changes, following the [Contribution Rules](#rules).
   3. Add a changeset describing changes made (`pnpm task dev:changeset`)
   4. Create a pull request, target `develop` branch.
3. Review feature:
   1. Sign CLA when requested.
   2. Feature will be evaluated by maintainer for release in a future version.

### Releases

> **Note** Ensure valid tokens are used in CI/CD prior to publishing.

1. Create a new `release/[VERSION]` branch off of develop branch.
2. Create a pull request, target `main`
3. Create a prerelease (when release is major):
   1. Version changes as prerelease: `pnpm task dev:changeset:pre -- enter next`. Commit changes.
   2. Create a new version: `pnpm task dev:changeset:version`. Commit changes.
   3. Tag release in git using the same prerelease version given by changeset.
   4. Push tag and preview changes to package and documentation once CI/CD finishes publish.
   5. Exit prerelease mode once changes are ready: `pnpm task dev:changeset:pre -- exit`
4. Create a release:
   1. Once determined ready, version changes: `pnpm task dev:changeset:version`. Commit changes.
   2. Tag release in git using the same version number given by changeset.
   3. Push tag and ensure CI/CD publish was successful.
   4. Merge into main branch.
   5. Update [Prim+RPC examples repository](https://github.com/doseofted/prim-rpc-examples) with new version.
