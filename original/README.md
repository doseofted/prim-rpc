[![Prim+RPC. Pictured are two very short JavaScript files: a simple function on the server-side and a call to that function on the client-side. Tagline: "Backend, meet Frontend"](./.github/docs-screenshot.png)](https://prim.doseofted.me/)

[![npm](https://img.shields.io/npm/v/@doseofted/prim-rpc?color=6D53FF&labelColor=2D0D60)](https://www.npmjs.com/package/@doseofted/prim-rpc)
[![npm license](https://img.shields.io/npm/l/%40doseofted%2Fprim-rpc?color=399EEC&labelColor=2D0D60)](https://spdx.org/licenses/Apache-2.0.html)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@doseofted/prim-rpc/latest?color=EB84FF&labelColor=2D0D60)](https://bundlephobia.com/package/@doseofted/prim-rpc@latest)
[^1]

**Prim+RPC is a bridge between JavaScript environments.** Call functions on the server as if they exist on the client,
without the wrappers. It's just JavaScript. You could bridge:

- Web server and client
- Two browser tabs
- Main thread and Web Worker
- Two separate processes
- Any other separated JavaScript environments

Prim+RPC is framework-agnostic (bring your own server and client tools), fully-typed, lightweight, doesn't require a
compile-step, and is loaded with features:

- File handling
- Callback support
- Custom serialization
- Error handling
- Request batching
- HTML form handling
- Documentation generation
- Access control

**If you know JavaScript, you know how to use Prim+RPC**. If you want access to a function, just call it: less setup,
easier access, quicker development of your API.

**[📖 Read the Docs](https://prim.doseofted.me/) ∙ [💡 Examples](https://prim.doseofted.me/docs/learn/examples) ∙
[⚙️ Setup](https://prim.doseofted.me/docs/learn/setup) ∙ [🔌 Plugins](https://prim.doseofted.me/docs/reference/plugins)
∙ [🧑‍💻 Follow Author](https://doseofted.me/)**

## Contributions

> [!NOTE]
>
> Prim+RPC is in early stages and is marching towards a [stable release](#release-plan). Support Prim+RPC by
> [starring the repository](https://github.com/doseofted/prim-rpc), sharing with others, and following for updates.

Happy to have you! Please see the [Contribution Guide](./CONTRIBUTING.md) to learn more. If you're only looking for how
to use the library, please see the [Documentation](https://prim.doseofted.me/).

## Issues & Security

- If you have any questions or are having trouble, feel free to open a
  [new discussion](https://github.com/doseofted/prim-rpc/discussions).
- For security-related issues, please refer to the [Security Policy](./SECURITY.md).
- If you discover a non-security issue with Prim+RPC, please
  [file a new issue](https://github.com/doseofted/prim-rpc/issues/new) so I can take a look!

## Release Plan

> [!WARNING]
>
> Prim+RPC is in **alpha** and it may be unstable. Keep up-to-date with the
> [latest releases](https://github.com/doseofted/prim-rpc/releases), report any
> [found security issues](https://github.com/doseofted/prim-rpc/security/advisories/new), and
> [participate in discussions](https://github.com/doseofted/prim-rpc/discussions) to help shape the future of the
> project!

Prim+RPC is planned to become stable by the end of 2025, prior to the release of Ted's
[portfolio website](https://doseofted.me/) that will make use of it. See the in-progress
[pull request](https://github.com/doseofted/prim-rpc/pull/101) for details regarding the next version of Prim+RPC.

Prim+RPC Core, the framework-agnostic core of the project, will become stable first and will be released once the
default plugins are stable. Lastly, Prim+RPC's optional tooling (such as documentation generation) will become stable.
At this point, the alpha tag is planned to be removed. Once I am using Prim+RPC in production, a v1.0 will be released.

## Licenses

This project consists of three parts: Code, Documentation, and Assets:

**Code**: The Prim+RPC code libraries (RPC core, plugins, and tooling) are licensed under the
[Apache 2.0 license](./LICENSE.txt). You may find library source code in the [`/libs`](./libs/) folder of this project.
Assets, which may appear alongside Code, are excluded from this license.

**Documentation**: The documentation website and text are [proprietary](./LICENSE-DOCS.md). You may find documentation
in the [`/apps`](./apps/) folder of this project. Unauthorized usage of Documentation outside of fair use is strictly
prohibited.

**Assets**: The "Prim+RPC" name and logo as well as the "Dose of Ted" name and logo are
[proprietary](./LICENSE-ASSETS.md). Assets are excluded from all licenses, regardless of where they are located in the
project. Unauthorized usage of Assets outside of fair use is strictly prohibited.

[^1]:
    These badges report stats for [`@doseofted/prim-rpc`](https://www.npmjs.com/package/@doseofted/prim-rpc) on the npm
    registry.
