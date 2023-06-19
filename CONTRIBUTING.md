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
- All commits should be professional and include detailed messages (as a best effort).

See the [Development Guide](./README.md#development) to learn how to get started.

## Processes

> **Warning** Work In Progress

Prim+RPC's processes are given today as follows:

### Features

1. Create an issue describing new feature and await feedback from community.
2. Develop a new feature:
   1. Create a new branch off of `develop`.
   2. Make changes, following the [Contribution Rules](#rules).
   3. Add a changeset describing changes made (`pnpm task dev:changeset`)
   4. Create a pull request, target `main` branch.
3. Review feature:
   1. Sign CLA when requested.
   2. Feature will be evaluated by Ted for release in a future version.

### Releases

> **Note** Ensure valid tokens are used in CI/CD prior to publishing.

Releases in this project are managed with [Changesets](https://github.com/changesets/changesets). Once a
[new feature](#features) is merged back into the main branch, a new PR will be opened by Changesets which will prepare a
new release.

Once this branch is merged, a Github action will deploy the new version. Some notes to consider when drafting a new
release:

- When working on a major new version, a new tag such as `@next` or `@alpha` may be used.
  - Use `pnpm task dev:changeset:pre -- enter [TAG_NAME]` to enter prerelease mode.
  - Use `pnpm task dev:changeset:pre -- exit` to exit prerelease mode
- Look over relevant examples and
  [update the Prim+RPC examples repository](https://github.com/doseofted/prim-rpc-examples) as needed.
