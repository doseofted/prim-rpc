[![Prim+RPC. Pictured are two very short JavaScript files: a simple function on the server-side and a call to that function on the client-side. Tagline: "Backend, meet Frontend"](./misc/docs-screenshot.png)](https://prim.doseofted.com/)

Prim+RPC is a bridge between JavaScript environments, without the extra boilerplate code. The primary use case of this
library is making plain function calls to a server from some client (RPC), as if that code had been written on the
client itself. The goal is to write plain JavaScript, or TypeScript if you prefer, and immediately invoke typed code
without verbose wrappers around the communication channel.

> **Warning** Prim+RPC is prerelease software. It may be unstable and functionality may change.

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

If you have any questions or are having trouble using Prim+RPC, open a
[new discussion](https://github.com/doseofted/prim-rpc/discussions).

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

## Release Plan

Prim+RPC is currently prerelease software but the goal is to reach a stable release. Prim+RPC itself (framework-agnostic
core of the project) will become stable first. Before Prim+RPC is released however individual plugins
(framework-specific code, known as method/callback plugins) will need to become stable since Prim+RPC depends on them.
Lastly, Prim+RPC's optional tooling (such as documentation generation) will become stable.

There is not yet a specific target date for these releases but I expect the Prim+RPC packages to generally become stable
between Q2 and Q3. This time frame depends on the initial success of this project and the timeline of projects that will
use Prim+RPC (such as [Prim+CMS](https://prim.doseofted.com/cms) and the new [Dose of Ted](https://doseofted.com/)
website).

## Security

See the [Security Policy](./SECURITY.md).

## Contributions

See the [Contribution Guide](./CONTRIBUTING.md).

## License(s)

Please refer to [Licenses](./LICENSE.md).
