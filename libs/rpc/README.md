# Prim-RPC

The idea behind Prim-RPC is to create a JSON-based RPC library that is inspired by (but doesn't necesarily cohere to)
JSON-RPC, JSON-LD, and validated with JSON-Schema all while being somewhat TypeScript compatible. The benefits are
that (1) instead of writing REST requests, I can write function calls, (2) I can optmistically return a result
back if I have an idea what the server will send back then update that reference through a reactivity library like Vue,
and (3) I can share some code between the client and server by utilizing different bundles (one for each, with the
client bundle only importing what it needs to support optimistic results).

Tools like GRPC and TRPC address similar issues. GRPC isn't well supported in Node and requires writing separate
protocol buffers which can become confusing. TRPC is great for TypeScript but your client and server have to be in
the same place so you can import types.

There are a few different ways to do this depending on priorites. Here is a version designed purely for TypeScript:

```typescript
// example.ts
export function sayHello(name: string) {
	return `Hello ${name}!`
}

// app.index.ts
//
import type * as exampleServer from "server-package/server"
import * as exampleClient from "server-package/client"
// server-package creates two bundles, limiting what goes in the client version
// all methods on server are suggested as type definitions even though server version's methods
// aren't available on the client (but are available by making HTTP call)
const prim = createPrim<typeof exampleServer>(exampleClient, { endpoint: "https://example.com/prim" })
const { value, loading } = prim("sayHello", "Ted") // returns value immediately if available
// once loading is finished, value is updated (as reactive variable in framework like Vue)
```

There are a few problems with that approach. One, it depends on the server's bundling tool to split code into
two separate bundles. This apporach might make some nervous because if a code editor suggests server-side code
it would be really easy to import if there are not some sort of tests in place to prevent that. It also faces the
same issue as TRPC because you need access to server code (or the client-side version of it, at least) to get those
type definitions.

Another version of this would be to make it more similar to TRPC but way less complicated by simply
removing the ability to use server-side code from the client-side and only importing type definitions. By removing
the need for code, It is much safer to since only type definitions are needed, reactivity no longer needs to live
inside of the module (rather some sort of extension could be built to make handling in UIs easier), and you still get
types like TRPC but without the need for a specially created server and special HTTP client to handle requests. Rather
Prin would act as a way to format requests server-side in framework of choice, and a wrapper on the client that will
simply format requests before being sent to browser's fetch utility (or other framework if overriden).

An alternative syntax could put less emphasis on TypeScript and use JSON-Schema, only outputting TypeScript definitions
once generated with a tool like QuickType (probably a wrapper around the tool that fetches an endpoint). So the server
would generate JSON-Schema, convert to TypeScript definitions through QuickType, at run-time to be downloaded by
the client at build-time:

```typescript
// server

export function sayHello(name: string) {
	return `Hello ${name}!`
}
// Prim would look at all members of module, gather parameters (still need to figure out how), and create JSON-Schema,
// again now sure how

// client
import type definitions from "./generated.ts" // or may just become available as namespaced item given in .d.ts file
const prim = createPrim<definitions>({
	sayHello: () => `Loading ...`, // client-side version to return until server returns result
})
```

The downside here is that definitions are only generated once so they could become outdated. Similar to how
GraphQL-Code-Generator generates types once, you're left updating each time unless a build step (like an
integration with Vite or other tool) could check the version of the given API at build time). In an environment like
Deno you could probably copy the definitions and make it available on the server and import from the URL.
This assumes those definitions are free to share (nothing secret should be in them anyway) but that rules out Node
unless the definitions are downloaded.

Another possible idea, not sure if this would work: I could use a series of Proxy functions built around
the given module definitions on the server and then once the proxy function is called, I take the name and arguments
give from the proxy and forward those to the server.
