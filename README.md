[![Prim+RPC. Pictured are two very short JavaScript files: a simple function on the server-side and a call to that function on the client-side. Tagline: "Backend, meet Frontend"](./misc/docs-screenshot.png)](https://prim.doseofted.com/)

Prim+RPC is a bridge between JavaScript environments, without the extra boilerplate code. The primary use case of this
library is making plain function calls to a server from some client (RPC), as if that code had been written on the
client itself. The goal is to write plain JavaScript, or TypeScript if you prefer, and immediately invoke typed code
without verbose wrappers around the communication channel.

[Read the Documentation](https://prim.doseofted.com/) ∙ [Try an Example](https://github.com/doseofted/prim-rpc-examples)
∙ [Work with Ted](https://doseofted.com/)

## Security

> **Warning** Prim+RPC is prerelease software. It has not reached a stable version.

If a security issue is found then please privately [report the issue to Ted](mailto:ted@doseofted.com). Prim+RPC is in
early stages and, as it progresses, a more robust policy should be created.

## Issues

If you discover an issue with Prim+RPC unrelated to security, search open issues and discussions in this repository to
determine if someone else has faced the same issue. Otherwise, feel free to report an issue _with_ a minimal
reproduction (consider [using an example](https://github.com/doseofted/prim-rpc-examples) as a starting point).

## Contributions

Prim+RPC depends on handlers/plugins to work with a wide variety of frameworks. These frameworks can sometimes be
difficult to integrate with when one is not familiar with the framework. Contributions for handlers/plugins or to rest
of the project are welcome!

> **Warning** It is possible that a feature is already being or has been developed or that a feature may have already
> been rejected. If you'd like to contribute to the project,
> [open an issue first](https://github.com/doseofted/prim-rpc/issues/new) and describe what change that you would like
> to make.

Some important rules and notes:

- Follow the Code of Conduct (TBD)
- Contributions made to a Prim+RPC project require a CLA (TBD).
- All projects in this repository follow [semantic versioning](https://semver.org/).
- Every completed pull request should have an
  [associated changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md).
- All commits should include detailed messages (as a best effort).

## License

This is a monolithic repository consisting of several projects. The repository itself is proprietary while individual
projects are separately licensed:

| Project                | Folder                       | License          |
| ---------------------- | ---------------------------- | ---------------- |
| Prim+RPC               | `./libs/rpc`                 | To be determined |
| Prim+RPC Plugins       | `./libs/plugins`             | To be determined |
| Prim+RPC Tooling       | `./libs/tooling`             | To be determined |
| Prim+RPC UI            | `./libs/ui`                  | To be determined |
| Example Library        | `./libs/example`             | To be determined |
| Prim+RPC Website       | `./apps/frontend`            | To be determined |
| Prim+RPC Documentation | `./apps/frontend/pages/docs` | To be determined |

You will find a license file (`LICENSE.md`) in each project's folder that describes the detailed license for which it is
made available. If a license is not made available then it is unlicensed meaning that usage is unauthorized.

## Development

See the [Documentation](https://prim.doseofted.com/) for usage instructions. These instructions refer to development of
the project itself.

[Node](https://nodejs.org/) is required for development. Install dependencies with `pnpm install`. If
[pnpm](https://pnpm.io/) is not installed, run `corepack enable` first to automatically install it. Scripts for this
project are defined with [Task](https://taskfile.dev/) in the [Taskfile](./Taskfile.yml). List all available options
with `pnpm task`.

Run `pnpm task dev:setup` to configure utilized [version of Node](./.nvmrc), enable its Corepack feature, and build all
parts of the project. Run `pnpm task dev:build` for subsequent builds. Watch for changes to the project with
`pnpm task dev:watch`.

If you prefer to work in Docker, configure the [`.env` file](./.env.example) and run `pnpm task compose:dev:up` (depends
on [Docker/Compose](https://docs.docker.com/get-docker/) and [mkcert](https://github.com/FiloSottile/mkcert)). When
finished, run `pnpm task compose:dev:down`.
