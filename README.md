[![Prim+RPC. Pictured are two very short JavaScript files: a simple function on the server-side and a call to that function on the client-side. Tagline: "Backend, meet Frontend"](./misc/docs-screenshot.png)](https://prim.doseofted.com/)

Prim+RPC is a bridge between JavaScript environments, without the extra boilerplate code. The primary use case of this
library is making plain function calls to a server from some client (RPC), as if that code had been written on the
client itself. The goal is to write plain JavaScript, or TypeScript if you prefer, and immediately invoke typed code
without verbose wrappers around the communication channel.

> **Warning** Prim+RPC is prerelease software. It has not reached a stable version.

[Read the Documentation](https://prim.doseofted.com/) ∙ [Try an Example](https://github.com/doseofted/prim-rpc-examples)
∙ [Work with Ted](https://doseofted.com/)

## Support

You can support Prim+RPC by [starring the repository](https://github.com/doseofted/prim-rpc), sharing with others,
contributing code (either to the core or plugins), sponsoring the project, or
[working with Ted on a new project](https://doseofted.com/).

## Issues

If you discover an issue with Prim+RPC unrelated to security, search open issues and discussions in this repository to
determine if someone else has faced the same issue. Otherwise, feel free to report an issue _with_ a minimal
reproduction (consider [using an example](https://github.com/doseofted/prim-rpc-examples) as a starting point).

If you are having trouble using Prim+RPC, open a [new discussion](https://github.com/doseofted/prim-rpc/discussions).

## Security

See the [Security Policy](./SECURITY.md).

## Contributions

See the [Contribution Guide](./CONTRIBUTING.md).

## License(s)

This is a monolithic repository consisting of several projects. The repository itself is proprietary while individual
projects are separately licensed:

| Project                | Folder                       | License                                        |
| ---------------------- | ---------------------------- | ---------------------------------------------- |
| Prim+RPC               | `./libs/rpc`                 | [To be determined](./libs/rpc/LICENSE.md)      |
| Prim+RPC Plugins       | `./libs/plugins`             | [To be determined](./libs/plugins/LICENSE.md)  |
| Prim+RPC Tooling       | `./libs/tooling`             | [To be determined](./libs/tooling/LICENSE.md)  |
| Prim+RPC UI            | `./libs/ui`                  | [To be determined](./libs/ui/LICENSE.md)       |
| Example Library        | `./libs/example`             | [To be determined](./libs/example/LICENSE.md)  |
| Prim+RPC Website       | `./apps/frontend`            | [To be determined](./apps/frontend/LICENSE.md) |
| Prim+RPC Documentation | `./apps/frontend/pages/docs` | [To be determined](./apps/frontend/LICENSE.md) |

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
