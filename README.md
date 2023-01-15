![Prim+RPC. Pictured are two very short JavaScript files: a simple function on the server-side and a call to that function on the client-side. Tagline: "Backend, meet Frontend"](./misc/docs-screenshot.png)

Prim+RPC is a bridge between JavaScript environments, without the extra boilerplate code. The primary use case of this
library is making plain function calls to a server from some client (RPC), as if that code had been written on the
client itself. The goal is to write plain JavaScript, or TypeScript if you prefer, and immediately invoke typed code
without verbose wrappers around the communication channel.

[Read the Documentation](./README.md)

## Development

See the [Documentation](./README.md) for usage instructions. These instructions refer to development of the project
itself.

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
