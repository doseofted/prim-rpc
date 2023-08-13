[![Prim+RPC. Pictured are two very short JavaScript files: a simple function on the server-side and a call to that function on the client-side. Tagline: "Backend, meet Frontend"](./misc/docs-screenshot.png)](https://prim.doseofted.me/)

[![npm](https://img.shields.io/npm/v/@doseofted/prim-rpc)](https://www.npmjs.com/package/@doseofted/prim-rpc)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@doseofted/prim-rpc/latest)](https://bundlephobia.com/package/@doseofted/prim-rpc@latest)

**Prim+RPC is a bridge between JavaScript environments.** Call functions on the server as if they exist on the client,
without the wrappers. It's just JavaScript. You could bridge:

- Web server and client
- Two browser tabs
- Main thread and Web Worker
- Two entirely separate processes
- Or **any two separated JavaScript environments**

Prim+RPC is framework-agnostic (bring your own server _and_ client tools), fully-typed, lightweight, doesn't require a
compile-step, and is **loaded with features**:

- File uploads
- Callback support
- Custom serialization
- Error handling
- Request batching
- HTML form handling
- Documentation generation
- Access control

Best of all, **if you know JavaScript, you already know how to use Prim+RPC**. If you want access to a function, just
call it: less setup, easier access, quicker development of your API.

Focus less on message transport and more on the message being sent, **with minimal setup**, using Prim+RPC:

[📖 Read the Docs](https://prim.doseofted.me/) ∙ [💡 Try an Example](https://prim.doseofted.me/docs/examples) ∙
[⚙️ Setup in Project](https://prim.doseofted.me/docs/setup#installation) ∙ [🧑‍💻 Follow Author](https://doseofted.me/)

Prim+RPC is in early stages and is marching towards a stable release. Support Prim+RPC by
[starring the repository](https://github.com/doseofted/prim-rpc), sharing with others, and following for updates.

<!-- prettier-ignore-start -->
> **Warning**
> Prim+RPC is in **alpha** and it may be unstable. Keep up-to-date with the
> [latest releases](https://github.com/doseofted/prim-rpc/releases), report any [found security issues](./SECURITY.md),
> and [participate in discussions](https://github.com/doseofted/prim-rpc/discussions) to help shape the future of the
> project!
<!-- prettier-ignore-end -->

## Contributions

Happy to have you! Please see the [Contribution Guide](./CONTRIBUTING.md) to learn more. If you're only looking for how
to use the library, please see the [Documentation](https://prim.doseofted.me/).

## Issues & Security

- If you have any questions or are having trouble, feel free to open a
  [new discussion](https://github.com/doseofted/prim-rpc/discussions).
- For security-related issues, please refer to the [Security Policy](./SECURITY.md).
- If you discover a non-security issue with Prim+RPC, please
  [file a new issue](https://github.com/doseofted/prim-rpc/issues/new) so I can take a look!

## Release Plan

Prim+RPC is currently prerelease software but the goal is to reach a stable release. Prim+RPC itself (framework-agnostic
core of the project) will become stable first. Before Prim+RPC is released however individual plugins
(framework-specific code, known as method/callback plugins) will need to become stable since Prim+RPC depends on them.
Lastly, Prim+RPC's optional tooling (such as documentation generation) will become stable.

There is not yet a specific target date for these releases but I expect the Prim+RPC packages to generally become stable
by end-of-year. This time frame depends on the initial success of this project and the timeline of projects that will
use Prim+RPC (such as [Prim+CMS](https://prim.doseofted.me/cms) and my [new portfolio](https://doseofted.me/) website).

## Licenses

The Prim+RPC core library, plugins, and tooling are licensed under the
[Apache 2.0 license](https://spdx.org/licenses/Apache-2.0.html). The documentation website is proprietary. Please refer
to [Licenses](./LICENSE.md).
