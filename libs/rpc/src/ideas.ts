/* eslint-disable @typescript-eslint/no-unused-vars */
enum Status {
	Idea,
	Implemented,
	PartiallyImplemented,
	Rejected,
	PartiallyRejected,
}

// NOTE: these ideas are slowly being moved over to prim-rfcs repository

/**
 * This idea is really two ideas but they're related, I think. Once implemented, it may also make ideas like
 * `supportChainedCallsAndClosures` easier to support.
 *
 * The first goal is to support return values on callbacks. Today, if you use a callback provided from the
 * client then those arguments are sent to the client when it is executed on the server. However, if that
 * function then returns a value then the server cannot receive that. This is (possibly) a common use
 * case for callbacks so it should probably be supported in Prim. This will hopefully borrow a lot of logic
 * from the client so that when that callback returns a value then the client intercepts that value and sends
 * it back to the server. Of course, for this to work then any callbacks defined on the server should be defined
 * as async (or return a Promise) since the result needs to be awaited from the client. This is similar to how
 * all functions called on the client must be awaited since this result is from the server. Example definition:
 *
 * ```ts
 * export async function testing123 (callbackThatReturnsNumber: () => Promise<number>|number) {
 *   const numberResult = await callbackThatReturnsNumber()
 *   // typeof numberResult === "number"
 * }
 * ```
 *
 * The second idea is to support returned closures from a called method on the client. This is somewhat
 * similar to the first idea except the logic is reversed. In this case, the reference to the function is
 * stored on the server and the client sends a second request over WebSocket for the previously given function
 * (this is similar to how callback references are resolved on the client but instead needs to work on the server).
 * Similar to callbacks, function references are stored except on the server this time. Just like callbacks,
 * the usage of any kind of closure should be limited and used carefully since function references are stored on
 * the server. Example (arguably a bad one, but demonstrates the point regardless):
 *
 * ```ts
 * // server
 * export async function createAccount(details: { email: string, password: string }) {
 *   const record = await someDatabase.add(details)
 *   function addProfilePicture (photo: string) {
 *     await record.update({ photo })
 *   }
 *   return addProfilePicture
 * }
 * // client
 * const addProfilePicture = await createAccount({ email: "ted@doseofted.com", "aGoodPasswordNotThisOne" })
 * await addProfilePicture(someUploadedPhoto)
 * ```
 */
let supportReturnValuesOnCallbacksAndReturnedFunctionOnMethod: Status.Idea

/**
 * Today, Prim+RPC can send back a JSON result from an RPC. That RPC can be JSON or it could be JSON
 * with binary attachments referenced in a form-data request. Sending binary data along-side RPC
 * is easy because there is format (form-data) that is well-known and easy to use that is intended
 * for this kind of purpose. Sending data back however is different. Generally, if you're sending data
 * back, it is either binary (some file) or data (like JSON). My initial hesitation against sending
 * back a file over RPC is because you can't send back a file and a response at the same time like you
 * can with requests because this my be a point of confusion.
 *
 * However, this may be a large limitation if an RPC is supposed to result in the return of a file, for instance,
 * a request that generates a calendar event or that adds a watermark to a video. In these cases, it may be useful to
 * send the file as a response (even if it's not possible to send RPC back with it).
 *
 * Ideally I would send both RPC and the intended file back, the same way that you can with a request (using form-data
 * as a response). This doesn't seem to be well-supported but I think instead Prim RPC could just detect if a response
 * is a Buffer/Blob/File/otherwise binary and send that back with appropriate headers. The Prim client would then need
 * to know how to respond to file data (or rather plugins for Prim RPC would need to do this).
 *
 * There are a few problems here. For one, I would need to send all binary data as octet-stream or some generic
 * mime-type because I can't know what the file type is without relying on another third-party library which would
 * need to (probably) read the file extension. Functionality should not be tied to one run-time (like Node or Deno)
 * rather it should be generic and then specific functionality handled by plugins. Because of this, Prim RPC itself
 * needs to send generic binary type of data back that is generally understood (streams/buffers).
 *
 * When some needs binary data *and* a response one workaround would be to use callback but this would be hacky and
 * shouldn't be recommended because it does feel hacky. This also isn't possible today (see next idea as of why).
 *
 * ...
 *
 * Looking into the form-data response option again, I notice that there is an option to convert a response into
 * form-data with the browser's built-in fetch client. In MDN it is noted that this is primarily for intercepting a
 * request/response with a worker but if I can find a server tool that can create form-data and send it back to the
 * client then this may solve my problem. This way both the Prim client and server can understand binary data through
 * form-data requests/responses and RPC results can include files along-side responses. In Deno, it appears that
 * the FormData object is actually supported but I don't believe that it is in Node and I'm not sure yet if the
 * "form-data" package on NPM solves that need yet. I'll need to look into it.
 *
 * It is worth noting that even if the default fetch client can parse form-data as a response, that most HTTP clients
 * will not likely support this. This is especially an issue when using a Prim RPC server outside of JavaScript. For
 * this reason, it may make sense to limit responses to either being RPC or being binary. Either this or I would need
 * to specify in the docs that while it's possible with the default client plugins, that it may not be possible in
 * other clients plugins or outside of JavaScript with popular HTTP frameworks today. Doing so would almost force some
 * users to use a certain client those which would go against why Prim RPC is so useful (bring your own frameworks).
 */
let sendBackBinaryData: Status.Idea

/**
 * Prim RPC can't send binary data and handle callbacks in the same function call because one requires an HTTP client
 * (binary files) while callbacks require WebSockets (or some similar tech through a plugin). This can be frustrating
 * because the callback could potentially send details back to the client such as upload or processing progress. For
 * this to work, I would probably need to use the WebSocket for these connections but I would also have to handle binary
 * files over WebSocket.
 *
 * It's possible and (seemingly) straight forward to send binary data but Prim+RPC would need to piece together multiple
 * WebSocket messages since each message is either binary or text (otherwise I would need to build a custom framework
 * for separating data given in a single message similar to what form-data does and this just isn't realistic and
 * unrelated to Prim RPC's goals).
 */
let allowFileUploadsAndCallbacks: Status.Idea

/**
 * Prim RPC is very useful in projects where the frontend and backend are contained in the same repository. You could
 * also have the frontend and backend in different repositories altogether but the downside with that kind of setup is
 * that types from the backend have to be copied to the frontend and it's easy for those types to become outdated.
 *
 * It's not always possible for the frontend and backend to live in the same repository, especially when a public API is
 * offered. To address this, Prim RPC should offer the ability to host type files from the server. These type files
 * would be packaged together with a package.json file and would be packed into a tarball expected by popular package
 * managers. Popular package managers support downloading packages from URLs in this format so this would be a great way
 * to share types for public APIs. As an example, Thin Backend provides this as an option to get a typed database
 * (and likely others).
 *
 * Prim RPC itself should probably not support this itself since it will depend on the framework used. Packaging types
 * into a tarball would be specific to NPM-like package managers (not sure how this would work with Deno). Instead, this
 * could be offered as a module to be used with Prim RPC (also a great example to show a module made by possible by
 * Prim RPC). It would be set up like this:
 *
 * ```ts
 * import { typeServer } from "@doseofted/prim-type-server"
 * // ...
 * createPrimServer({
 *   module: {
 *     types: typeServer({ types: "./types" })
 *   }
 * })
 * ```
 *
 * There are some potential problems with this kind of setup. The biggest one is versioning. How should the version be
 * declared? It needs to be contained in the URL somehow so a version can be pinned. However Prim RPC should not dictate
 * how versioning is done. There are many different ways to version software and multiple levels in the stack. When
 * hosting a public API, multiple versions will need to be served as well and some developers may have apprehensions
 * about creating multiple Prim Servers to host different versions. For this reason, this "type-server" module should
 * not provide a "version" option since versioning should be handled by the module(s). There should be a method to
 * signal what version is provided to this "type-server".
 *
 * A module could export an object with a property ".version" that would be a semver-compatible name (a string). It
 * doesn't technically have to semver since the package would not have the same constraints of the NPM registry but
 * it's still a good idea to have (whether this should be enforced by Prim is questionable, probably not). The question
 * is then how does this version property get communicated to a "type-server" module. What if there are multiple
 * versions?
 *
 * Versioning should not be handled by Prim RPC. The only reason that versioning needs to be known by Prim RPC is so
 * that it can be signaled to package managers that the types need to be updated. Otherwise, updates to types may not
 * be received or even worse, if some developer removes old type definitions (for some odd reason), then anyone who
 * downloads types would not have the same development environment as another developer. Using the NPM registry with
 * semantic versioning would be the fix for this. It would be handled like any other dependency but developers building
 * a public API do not want to rely on NPM for their API (it's okay for JS API clients, not the API itself). This is why
 * types should be hosted alongside the API itself.
 *
 * There are other potential problems with this approach. For one, Prim RPC works with many frameworks while this
 * "type-server" would depend on features specific to platforms. For instance, a node-module solver would be needed to
 * find where type files are located if given a package name (otherwise a file path for types would be needed which
 * isn't always known by the developer or in the same place at all times). I would also need a tool to tar the final
 * contents to be compatible with popular package managers.
 *
 * May this "type-server" should instead be part of some "prim-cli" module. Since this has to do with packaging types
 * to be made available, it makes sense to make this part of some build process. I'm completely against relying on a
 * build process in Prim RPC but since types with TypeScript naturally are outside of the run-time processes, it makes
 * sense to separate the ability to package types into a separate module altogether in the same way that the
 * documentation generator is separate from Prim RPC.
 *
 * In fact, it may make sense to combine Prim RPC's documentation generator and this "type-server" idea into one package
 * called "prim-rpc-tools". This way, This "tools" project would include the documentation generator but would also
 * include a second build for a CLI tool that would read build output (that includes type definitions) and then package
 * types (and types only) with some package.json, tar it, and then make it available on the hard drive. There would then
 * be some sort of very small run-time component (for use in Prim RPC as a module) that would serve this tarball without
 * having to rely solely on some pre-configured HTTP server (instead that generic server would be a plugin for Prim
 * RPC). This would solve the platform-specific issues since the types would be generated outside of Prim RPC and the
 * portion of the "type-server" that is used with Prim RPC is generic and just serves the final tarball to the user.
 *
 * It's also worth noting that Prim+RPC will first need to support binary data as a response before this feature can be
 * added (because the package manager will request from the URL and expects a tarball). Binary responses are already
 * planned but this feature of serving types does depend on that feature being finished first.
 */
let useTypesOutsideOfBackendProject: Status.Idea

/**
 * Building on the `useTypesOutsideOfBackendProject`, it might be a good idea to combine the documentation generator
 * with the "type-server" described earlier and call this "prim-rpc-tools". The documentation generator today simply
 * reads some prebuilt TypeDoc output and creates a simpler version of it that specifically is for RPC. By building a
 * CLI instead, I could use the TypeDoc tool as part of the CLI to generate TypeDoc and then also generate the RPC docs
 * alongside it. This way, the developer doesn't need to run two commands if they're only interested in the RPC docs.
 * This would require a specific version of TypeDoc which doesn't appear to be completely stable so it may not be a good
 * idea to use it directly but instead rely on the output of the tool so developers can freely update their TypeDoc
 * version (this is how the docs generator works today anyway).
 *
 * Another part of this "prim-rpc-tools" CLI would be the "type-server". This would be a post-build step once TypeScript
 * types have been generated. This CLI would be run after build and would check for all type definitions and read the
 * local package.json (or generate a new one) and then tarball the entire thing. The resulting file would then be made
 * available in some "dist" folder for use in Prim RPC server.
 *
 * Since this "prim-rpc-tools" module could include other tools, I could also house a separate project that would serve
 * an entire module with a pre-configured HTTP and WS server. This would remove a barrier for someone looking to get
 * started with Prim RPC because they would not have to configure other tools. So, if someone has already created a
 * module that they want to serve, they could simply execute it with the following:
 *
 * ```zsh
 * pnpx @doseofted/prim-rpc-tools serve ./dist/server.js
 * ```
 *
 * The above example assumes that someone built their server but you could also just use the source directly. By using
 * a tool like "tsx" (Node.js with TypeScript support), the above command could be simplified by just specifying the
 * TypeScript file directly (then the question becomes how does one share the Type definitions with the client; would
 * you import the file in the client using a statement like "import type ... from '...'"?).
 */
let primToolsCli: Status.Idea

/**
 * There are a lot of different ways to handle files (1) in server frameworks (think Buffer/Blob/File), (2) in terms of
 * storage of those files (local/object-storage/other), and (3) how that file is expected to be handled
 * (Stream/Buffer/filename). Today, Prim RPC has the ability to handle binary data outside of the RPC by linking that
 * external file as an ID on the RPC (`_bin_someIdentifier`) but it is solely up to plugins to determine how that given
 * content is (a) sent to the server and (b) how that file is read by the server.
 *
 * This functionality should probably be broken off into a separate handler. The difficult part of having a separate
 * file handler plugin is that the server needs to understand multiple ways that a client could send a file. For this
 * reason, there needs to either be:
 *
 * - two separate file handlers/plugins on the client/server that work hand-in-hand (more to write but easier)
 * - one handler that supports any kind of possible input from the client/server (difficult to write)
 *
 * This also will likely have to support the client/server plugins which means the interface returned by a file handler
 * plugin needs to be generic which is difficult because you may handle files differently in frameworks like Deno and
 * Node (both have Buffers an an option but only Deno has File from Web API, for example).
 *
 * This needs careful thought before implementing. In the meantime, it may be well enough just to let this functionality
 * be specific to server plugins while the client generally sends form-data requests. This is HTTP specific meaning that
 * WebSockets can't easily support files this way but the intention with a dedicated blob/file handler plugin is to make
 * this more generic.
 *
 * Also worth noting, some "JSON handlers" that could be used with Prim in the future may not necessarily be JSON. For
 * instance, if @msgpack/msgpack is used then binary contents may be directly referenced in RPC. This is not yet
 * fully supported but should be soon. This situation will need to be considered when writing a "blob handler."
 */
let blobHandler: Status.Idea

/**
 * Today Prim RPC supports custom JSON handlers like superjson. However, it's important to note that today these
 * handlers need to support serialization to a string. This isn't really possible in any kind of efficient way when
 * handling files. However, formats like msgpack and BSON are like JSON but support binary contents. These should
 * become supported in Prim as a JSON handler. Using a handler like @msgpack/msgpack isn't problematic with Prim RPC
 * itself as long as `.stringify()` and `.parse()` options are given.
 *
 * ```ts
 * import { encode, decode } from "@msgpack/msgpack"
 *
 * createPrimClient({
 *   jsonHandler: {
 *     stringify(given) { return msgpack.encode(given) }
 *     parse(given) { return msgpack.decode(given) }
 *   }
 *   // ... more options
 * })
 * ```
 *
 * Instead, the problem is with client/server plugins. Today it's assumed that the serialized JSON given is a string.
 * That's a safe assumption for JSON data usually but to support something like msgpack, every client plugin would
 * need to be able to determine if given JSON is binary and format their requests if given binary "JSON-like" data.
 * This is the case for some Prim RPC client plugins (ones that use HTTP) since a fetch request would need to format a
 * request with binary data. It's also the potential case for a method handler if any processing is needed to turn given
 * data into a format expected by the "JSON" handler (such as turning a Stream into a Blob, maybe?).
 *
 * This does appear to be easy to implement in Prim RPC itself (I don't believe any changes are needed). However, every
 * Prim plugin (client and server side) would need to either:
 *
 * - expect given JSON to be either a string or binary-like (Buffer/Stream/File/Blob)
 * - expect some sort of generic interface given by Prim RPC for JSON (more work to be done on Prim RPC itself) as well
 *   as plugins
 *
 * It's also worth noting that support for Streams would be difficult (but potentially needed for large files). That may
 * need to also be considered.
 */
let supportBinaryJsonHandlers: Status.Idea

export {}
