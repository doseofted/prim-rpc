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
 * Currently I have to make each function async (regardless of whether promises are used) that type definitions are
 * correct when accessed from the client (because function is going over the internet). However, that function doesn't
 * need to be async on the server and becomes a nuisance because otherwise plain functions now need to be async if they
 * depend on a result of that function used in Prim client.
 *
 * Technically, the function doesn't have to be async because you can await anything including non-promises but since
 * TypeScript complains I could see someone potentially making all functions async which is a nuisance. This is
 * especially problematic because if someone edits that code and their IDE doesn't do type-checking, they may expect
 * that a function returns a regular value (when called on the server, not client of course) not knowing that it's
 * actually wrapped in a promise.
 *
 * So, ideally I'd be able to take the module types given to the Prim client and deeply convert all contained functions
 * to an async function since all functions are async on the client regardless of TypeScript types. The types used
 * now are not correct since I'm actually returning a proxy object and the actual return type on the the client is a
 * promise. I just need to make the types reflect this.
 *
 * I could use the "type-fest" module for this since they have some type that could be helpful such as `SetReturnType`,
 * `Schema`, `IterableElement` and most importantly: `Asyncify`
 */
let autoTransformModuleType: Status.Implemented

/**
 * Consider adding `fetch()` method that can be used to fetch given URL. So instead of just returning the client,
 * I would return `{ client, fetch }`. For instance:
 *
 * If developer gets first page of data (where `.getData(page: number)`):
 * ```
 * const data = await prim.client.getData(1)
 * // data == { given: "something", page: 1, nextPage: "/prim/sayHello?page=2" }
 * ```
 *
 * Instead of calling `prim.client.getData(data.page + 1)`, I could call `prim.fetch(data.nextPage)`
 * to make use of Prim-RPC's handling of GET requests.
 */
let fetchFromPrimRpcResult: Status.Idea

/**
 * Prim can make function calls and listen for events over callbacks. The next step would be to support
 * closures given over callbacks or returned from a function. This would required the callback handler (usually a
 * WebSocket connection) and would ideally work very similar to how callbacks are handled today.
 *
 * For reference, today, callbacks given on the client are turned into special "callback identifier strings" that, when
 * sent to the server, are identified and turned into callbacks that, once executed, are turned into events that trigger
 * a message to be sent back to the client.
 *
 * These messages are simply values supported by the JSON handler right now. To support closures, any value given that
 * is a function would be turned into a "function reference identifier string," the function itself saved to a variable
 * in the current callback handler session (a WebSocket connection usually) so it can be called later, and then the
 * client would transform the given identifier into a function that, once called, would send an event to the function
 * on the server triggering the saved function in the handler session. The reason the function needs to be saved to a
 * variable is because this function is a closure and that reference would otherwise be lost once the function call or
 * callback is made.
 *
 * This would need to happen over and over again between the server and the client so that any time a function call is
 * passed, it gets called, whether that is on the client or the server. This could allow for complex calls to be made
 * like so:
 *
 * ```ts
 * // some made up API using initialized Prim Client (quick, bad example):
 * prim.updateUser(userId, { name: "Ted" }, async (updatedUser, getBlogPosts) => {
 *   console.log(updatedUser.name)
 *   const posts = await getBlogPosts()
 *   console.log(posts)
 * })
 * ```
 *
 * One problem to note with supporting closures is actually the same problem with using callbacks. These references
 * need to be stored and since the thing being stored is a reference to a function that storage cannot be external
 * like a redis database. It should also be noted that this only works with the server where a function call is made
 * although this shouldn't be an issue for most cases since the WebSocket connection should be kept with a single
 * server (methods calls to server may possibly round-robin across multiple servers but callback handlers are generally
 * used with the first server that is contacted, of course if that connection is lost then so are all handlers).
 *
 * It's also worth noting that a closure may not be the direct parameter of the function so a given object that contains
 * functions would either be lost when sent to the client or references would need to be found and stored (possibly
 * a whole bunch of them) on the object deeply.
 *
 * Yet another problem is a closure that returns a value (the obvious use case for a closure or any function call).
 * Each returned value from that closure would need to be a promise which would not agree with the TypeScript
 * definitions unless I was to go through all parameters and make all callbacks return promises like I did with
 * `PromisifiedModule<M>` (which I already thought wasn't possible, not even sure how that would work with parameters).
 * Even if I was to update the TypeScript definitions, I would still need to make those closures return actual promises
 * which could be done by awaiting the event from the server/client. Since the closures could be nested, I may even
 * need to create some dedicated "Prim Callback Client" to handle these kind of events and the temporary functions
 * for which it would work on.
 *
 * The issue with supporting closures given to a callback is also related to supporting chained function calls like so:
 *
 * ```ts
 * // example of function returning an object with functions (or an instantiated object from class)
 * const user = await primClient.getUsername("doseofted").setFirstName("Ted").update(updated => {
 *   console.log("Status:", updated)
 * })
 * console.log("New first name:", user.firstName)
 * // example of function directly returning function
 * const result = await primClient.add(5)(5)
 * console.log(result, result === 10)
 * ```
 *
 * The first example would be incredibly useful because a function could return an instantiated object and I could
 * call methods of that object (super useful for working with an ORM). Chaining methods share the same difficulties as
 * supporting closures. Chaining could happen multiple times (e.g. `client.set(0).add(5).subtract(3).multiply(5)`) so
 * the server would need to store these references for the callback session, possibly a whole bunch. Each part of chain
 * could return any type of object so knowing which functions references to save and which are return values would
 * be difficult.
 *
 * One unique issue with supporting chained calls is that Promises returned from Prim Client would need to be extended
 * so that another function call could be made without having to await the previous function (Prim Client would in turn
 * need to internally await each chained call). This would also involve updating the TypeScript definitions again to
 * support some form of an extended Promise (which may be possible but TypeScript definitions will become even more
 * complicated). This extended promise would possibly become another dedicated client like "Prim Chained Client"
 * that shares some functionality with the closure handler, yet another possible Prim client.
 *
 * To sum this up, this would be very difficult to implement, would possibly be confusing for developers since not
 * all use cases could be supported initially, will make maintenance of the project difficult, and may not be
 * reasonably accomplished by a single developer in a reasonable amount of time.
 *
 * I still think it might be worth (possibly) exploring in the future if the project finds success.
 *
 * Today, Prim is a simple RPC library so, in that sense, the functionality at least matches
 * common uses of RPC-like frameworks like GraphQL and gRPC. By allowing communication from client to server
 * (method calls) and vice versa (with callbacks), the tool also provides a clean way of performing HTTP/WS using
 * regular functions without having to touch the protocols themselves. for simplicity's sake, that may be enough as
 * long as Prim RPC's restrictions are communicated clearly:
 *
 * - Returned values from a module's methods must be supported by the configured JSON handler
 *   - TODO: consider supporting returned functions in the same way that callbacks are supported
 * - Parameters given to a method's callback must be supported by the configured JSON handler
 * - Methods on client must be awaited (result is fetched from server)
 * - Callbacks on server must be awaited (result is fetched from client)
 *   - TODO: Callbacks cannot return a value ...yet. I'd like to fix this.
 */
let supportChainedCallsAndClosures: Status.PartiallyRejected // for now

/**
 * There's the possibility that types for functions on the server will be specific to Node while types given
 * from the client will differ. One example involves file uploads as hinted at in idea `fileUploadsAsPartOfPrimPlugin`.
 * In that example, a file is a Blob on the client but a Buffer on the server. While there's a lot of work to support
 * file uploads, this idea simply references replacing one type with another.
 *
 * Today I'm transforming the given module type to Prim Client so that every function returns a promise because the
 * Prim Client will return a promise through its proxy since the result is from the server (even though the function
 * defined on the server may not be a promise at all). This same `PromisifiedModule` could be extended so that given
 * types in a function's parameters or return type are transformed on the client.
 *
 * Doing so would make the following code valid:
 *
 * ```ts
 * // defined on server
 * function sayHello(str: Buffer): Buffer {... }
 * // on client (parameter is string, not Buffer)
 * const result = await prim.sayHello("Ted")
 * console.log(typeof result === "string")
 * ```
 *
 * Of course, I might be able to pass in a string to the client without TypeScript complaining but the server
 * will still reject it. In order to transform the actual string, I would need to consider adding pre-hooks and
 * post-hooks like I talk in the idea labelled `requestHooksContextAndFileUpload` above.
 */
let transformTypeScriptTypes: Status.PartiallyImplemented

/**
 * It could be dangerous to export an entire module it may export more than just the functions needed by Prim RPC.
 * Even with carefully controlled exports, there are some parts of an export that shouldn't be called. These are two
 * different scenarios but both concern security of the server. This idea should fix both.
 *
 * The first scenario concerns unintended exports. For instance, if I define a single function `sayHello()`, I would
 * not want someone to call `sayHello.apply(...)` or `sayHello.toString()`. To prevent this, I could search the given
 * path of the RPC call, such as `sayHello/toString` and prevent running the given function (toString) if it belongs to
 * another function (sayHello). This however would prevent someone from defining another function on a function object
 * which may be inconvenient.
 *
 * For instance, if I a defined a `docs()` function on a function object that returns
 * documentation for that function, like `sayHello.docs()`, where `sayHello` is a function, this would not work if I
 * implemented the path technique described above (some developers may use this feature of JavaScript where functions
 * are objects). This also would not prevent someone from calling a method or some function defined on a regular
 * variable. This leads me to the second scenario.
 *
 * The second scenario concerns how a module is exported. For instance, when a variable is exported from a module.
 * Consider this example:
 *
 * ```ts
 * export const serverSecret = process.env.SERVER_SECRET ?? ""
 * export function authenticateUser () { ... }
 * ```
 * While this code should (probably) not be written in the first place, if someone exports a secret then it could
 * be exposed if used with Prim RPC Server. While `serverSecret` is not callable from the server,
 * `serverSecret.toString()` very well could be. This is the case with most variables and their built-in methods.
 * Since I don't have a way to differentiate between a module export and a variable export (that I know of), then I
 * need some other method of defining which functions are allowed to be exposed on the Prim Server.
 *
 * While one of the goals of Prim RPC is to keep server-specific code outside of the module, this may be an instance
 * where it's necessary. I can think of two ways to prevent unintended exported functions.
 *
 * The first way is probably the simplest: check for a property `.rpc` (or some custom property name defined on the
 * server) for a `true` value on a function and only call the function when it exists. As an example:
 *
 * ```ts
 * function sayHello() { ... }
 * sayHello.rpc = true
 * function topSecret() { ... }
 * const serverSecret = process.env.SERVER_SECRET ?? ""
 * ```
 *
 * Since Prim RPC Server would check for `.rpc` property then `topSecret()` and `serverSecret` are not callable from the
 * server while `sayHello()` would be callable from the server. By default, any methods defined on a function object
 * should also not be callable (using path blocking method described in first scenario) which means `sayHello.docs()`
 * would not be callable from the server by default. However, these methods could be useful so, as an additional
 * option, I think a Prim RPC Server option of `allowMethodsOnFunctions` should be defined so that methods can be
 * called. Since this could be dangerous, the option should be an allow-list of method names allowed on any function.
 * Like so:
 *
 * ```ts
 * const prim = createPrimServer({
 *   module,
 *   ...otherOptions,
 *   allowMethodsOnFunctions: ["docs"] // by default: `false`
 * })
 * ```
 *
 * This would allow `sayHello.docs()` to be called when `.rpc` is `true` but would prevent other default methods or
 * other custom methods on a function object from being called, like `sayHello.toString()`.
 *
 * This method as described in the second scenario would work well but does require explicitly defined properties on
 * the module's methods. These are not server-specific which is good but it may become tedious. Adding to the Function
 * prototype or extending a Function class is also out of consideration since this leads to unpredictable code, doesn't
 * play well with TypeScript, and is generally frowned upon (including by myself).
 * I think another option could be presented to prevent needing to define `.rpc` property on every function. While it
 * may keep the module itself clean of extra `.rpc` properties, it may be just as tedious. I could define an object as
 * an option of Prim Server that defined allowed functions, like so:
 *
 *  * ```ts
 * const prim = createPrimServer({
 *   module,
 *   allowedFunctions: {
 *     sayHello: true,
 *     someSubmodule: {
 *     someFunction: true
 *   },
 *   allowMethodsOnFunctions: false
 * })
 * ```
 *
 * So, with this `allowedFunctions` option, `sayHello` and `someSubmodule/someFunction` are callable but nothing else
 * in the module is callable. I think the `.rpc` property is much cleaner and also clearer because it's defined
 * alongside the function so I may not include this option (but maybe it's a nice alternative, if a developer would
 * like to use a few methods of some downloaded package directly). To implement the feature with proper TypeScript
 * types, I could use `Schema<Module, boolean>` given by the type-fest package to allow properties of module to be
 * auto-suggested with a value of boolean for each function.
 *
 */
let exposedRpc: Status.Implemented

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
