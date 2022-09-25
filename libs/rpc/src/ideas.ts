enum Status { Idea, Implemented, PartiallyImplemented, Rejected, PartiallyRejected }
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * IDEA: consider creating createPrimUniversal that creates two instances of Prim, one for
 * client-side use, the other a server-side instance. This way, client-side placeholders
 * for functions could return immediately (and return optimistic response) while
 * waiting for the real response from the server. The client-side placeholders would
 * only contain a partial version of the server-side functions since not all functions
 * should return an optimistic response (instead they should just load).
 * 
 * This could look something like this (with a state library like Vue's):
 * 
 *
 * ```typescript
 * const { sayHello } = createPrimUniversal<typeof moduleServer>({ ...options }, {
 *   sayHello(name: string) { return `Loading, please wait ${name} ...` },
 *   sayGoodbye(...) { ... }
 * })
 * const { result, loading } = await sayHello("Ted")
 * watchEffect(() => console.log(result.value, loading ? "loading" : "loaded"))
 * ```
 * 
 * Another separate idea, related to data management rather than just RPC
 * is to allow these reactive values to be updated which would then trigger
 * a network request.
 * 
 * I could alternatively use callbacks instead of vue's reactive library
 * but it would be nice to have a tight integration
 * with a UI framework so boilerplate code doesn't need to be written.
 */
let reactiveInterfaceIdea: Status.Idea

/**
 *
 * When using graphql, I get to batch what would usually be many separate requests into one single request. With REST,
 * each request has to made individually unless batched together by the server by exposing an endpoint dedicated to
 * that function.
 * 
 * Prim currently supports:
 * - one function response over an HTTP request
 * - one function response with multiple uses of provided callback function over WS connection
 * 
 * I should allow the Prim server to batch requests. Each RPC call made in a certain interval would then be added to an
 * array and once that interval is over, the array of RPC calls is sent to the server and received answers are mapped
 * back to the requesting function by the client-generated ID. This interval should be extremely short so that only
 * requests made directly one after another are sent in batch (for instance, 10ms).
 * 
 * Using this method of batching, I can batch non-related requests that don't depend on one another. When one request
 * depends on the response of a another, the client will await the result of the function call and then using that
 * result, will make the next function call (or batch of calls).
 * 
 * However, if a websocket has been configured, this batching may not be needed at all since a dedicated connection
 * with the server has already been created. It may make sense just to use websocket for this purpose.
 * 
 * Since this may become complicated but I should try to keep functionality simple and consider implementing either
 * batched requests over websocket or batched HTTP requests, since implementing both may take more time. Ideally,
 * I could implement both over WebSocket with HTTP fallback if client is not setup, by using generic events.
 */
let batchRequests: Status.Implemented

/**
 * Allow uploads of images by supporting multipart form data. Each field could be considered a property of an object
 * parameter to a function. So, for instance if a form exists on a page with an action `/prim/createProfile`,
 * (or `/prim/create-profile` if I support camel-case -> url conversion of function names), and that is a request to
 * the Prim Server, then a field named "profilePicture" would be passed as `{ profilePicture: Buffer }` on the server.
 * 
 * If I support image uploads over multipart data then I could also pass other fields over the form too, for instance
 * a text field on a form named "firstName" would then be passed as `{ firstName: string }` on the server, or with the
 * profile picture example, the parameter would become `{ profilePicture: Buffer, firstName: String }` to the requested
 * function on the server.
 * 
 * Note that Node servers don't typically support multipart data by themselves, so it would have to be noted in some
 * sort of documentation that a framework like Multer is required to process form data into Node-specific types.
 * I would then need to know where to read this data. So each Prim Plugin would need to know where to look for
 * multipart data (not a problem if I can assume everyone is using "multer" with Express but if someone else if using
 * another multipart library like "formidable" then the file location could be different).
 * 
 * I would almost need to create another Prim Plugin for multipart form data that connects to the Prim Plugin
 * for the HTTP server, like so:
 * 
 * ```typescript
 * fastify.register(primFastifyPlugin, { prim, multipart: "fastify-multipart" })
 * ```
 * 
 * This way, I know where on the request I can expect to find the file. This may be too complicated initially.
 * I may need to recommend handling file uploads separately from Prim through whatever HTTP framework is used
 * so I can focus on other, less complicated Prim ideas.
 * 
 * Another issue is the difference in function signatures between the client and server. Since Prim primarily deals
 * with simple formats supported in both Node and the browser, it's not been a problem so far. However, with file
 * uploads, a file may be a Blob in browser while it may be a Buffer in Node (for example). I would need to make sure
 * that files are provided to Prim-handled functions as a string or other shared variable type (maybe a Blob? Idk).
 * 
 * I think even in GraphQL, there's not a built-in way of uploading files (which makes sense, because your requests
 * are always in GraphQL's query language). There is a spec for multipart data and Node library built on the concept
 * but I'm not sure that everyone agrees that it's a good idea.
 * 
 * The simple option that I'm overlooking here is uploading the image as a base64 string from the client however it's
 * far from the intended way of uploading files, with multipart forms. This base64 string would also have to be
 * converted back on the server to be saved as a file. This is a lot more processing but might be a simpler
 * alternative to processing multipart data until there's time to implement.
 * 
 * Since this is more of a MVP/POC right now, I should either not support file uploads at the moment and encourage
 * the use of a separate HTTP route dedicated to that function or if absolutely needed, work with base64 encoded
 * strings as file uploads if I decide to support it.
 * 
 * If I use blobs using base64 string, I could combine this with a JSON serialization library like "superjson"
 * (more details in idea below) and use this to support data types like Blobs (maybe). That's a really rough idea
 * and I might need to think more about how that integration would work (it would be only if someone uses a
 * specific HTTP/WS client which is fine if I write a Prim Plugin to support it but it would make it harder if someone
 * was to decide to write their own Prim Plugin).
 */
let imageUploadsAndFormSupport: Status.PartiallyRejected // see idea about context, request hooks, and uploads below

/**
 * Prim RPC is not really intended to work with parameters provided over the given network protocol but is instead
 * a way to handle parameters with just the programming language, JavaScript. However, sometimes fields provided
 * over HTTP may be useful for transitioning or to prevent repetitive tasks (like passing a token for each function
 * call that requires it when you would simply set an HTTP header in a regular request).
 * 
 * One way of easing this transition would be to pass the context to each function through the use of hooks that
 * run before and after a function call. These would be something like a "method hook" and would look like this:
 * 
 * ```ts
 * type Context = { req: express.Request, res: express.Response }
 * const callSayHello: PrimCall<typeof sayHello, Context> = (params, context) => params
 * function sayHello() { ... }
 * const sendSayHello: PrimSend<typeof sayHello, Context> = (returned, context) => returned
 * ```
 * 
 * Note: context bit and how it is provided is explained later.
 * 
 * So, the server would first look for `module.sayHello` and if pre-hook `call____` exists where ____ is the function
 * name then that function would be called with the parameters array as the first argument and server context as
 * second. The pre-hook would return the modified parameters to be used in `sayHello` (for instance, values known only
 * on server). The return value of `sayhello`
 * is passed to the post-hook, `send___`, as the first argument, context as second. The modified return value is
 * returned to the client (value may be modified, for instance, to ensure structure of return result). 
 * 
 * These method hooks would allow someone to validate given data with a pre-hook and then validate the result with a
 * post-hook. This way the method itself doesn't need to do basic validation of its given data (some will always be
 * required, of course). This also means that validation steps could be shared, so a single pre-hook or post-hook
 * could be defined and shared with each function like so:
 * 
 * ```ts
 * import { authorizeUser } from "./predefined-hooks"
 * const callSayHello = authorizeUser
 * function sayHello() { ... }
 * ```
 * 
 * The context part would be established by whatever server framework is being used. So, for instance, if you're
 * using the Express Prim plugin, then on each request, it would call some function `setContext({ req, res })`. The
 * value would then be passed to hooks on the requested method. The context type would be passed to Prim Server's
 * generic parameters, like so (since I don't think this can be inferred):
 * 
 * ```ts
 * type MethodContext = { req: express.Request, res: express.Response }
 * type WsContext = { ws: WebSocket.WebSocket }
 * const server = createPrimServer<MethodContext, WsContext>({ ... }) // for example
 * ```
 * 
 * This could even be used to support transformations on the request. For instance, Prim doesn't currently support
 * file uploads using FormData but if you used FormData to upload a file and then attached the JSON data
 * (RPC call in my case) as a field on that form (I believe GraphQL multipart upload spec and Google Drive API take
 * that method but I'm not sure) then you could process the file with the context in the request hook and then
 * pass that parameter from the pre-hook as a filepath string (for example) so it becomes useable from the called
 * Prim Server method.
 * 
 * However, now that I think about it, if the request contains FormData then the pre-hook would not be able to parse
 * parameters yet. I'll need to keep thinking on this one. Adding hooks may not be initially supported and if they are,
 * handling multipart data probably wont be the initial concern.
 * 
 * Maybe `imageUploadsAndFormSupport` idea above would be a better option (to support FormData, not base64 strings,
 * bad idea) to handle file uploads. Regardless, hooks would be very useful for verifiying data and working with
 * context provided over the HTTP/WS request.
 */
let requestHooksContextAndFileUpload: Status.Idea


/**
 * # Idea
 * 
 * Prim-RPC is intended to handle JSON-based RPC messages but since it doesn't really care what server you use because
 * server actions are generic and provided to plugins, those plugins could support file uploads. For instance, someone
 * could make an RPC request through multipart data by first sending the RPC as a field (the JSON payload as value) and
 * then the file as a second field (remember that order is important since a user may choose to respond to given RPC 
 * while file is still processing, maybe passing callback to show status of upload).
 * 
 * This would require each plugin to handle a condition where given request body is either multipart or a JSON body.
 * This would make plugins much more difficult to write since each framework has their own method of supporting
 * multipart data that's not part of the framework itself (Fastify has @fastify/multipart based on busboy,
 * Express has Multer also based on busboy, busboy could be used on an "node:http" server, or something that's not
 * based on busboy could be used such as formidable which has middleware for Express and "node:http").
 * 
 * Prim-RPC shouldn't really dictate how RPC is sent and received from the server (leave this to plugins) but it should
 * probably specify the RPC structure including how file uploads should be referenced, this way plugins can be written
 * that either support multipart operations or at least so that plugins can be created in a consistent way,
 * transforming given data to a form that can be understood from RPC call and in a way that the developer can understand
 * regardless of how they want to process uploads.
 * 
 * ## Possible Implementation
 * 
 * The easiest way to do this would be to process each upload and pass it as a reference to the RPC call. I still need
 * to read up on how multipart works but below is a pseudo-form to demonstrate how this might work in Prim-RPC.
 * 
 * ```txt
 * Content-Type: multipart/form-data; boundary=prim-boundary
 * 
 * --prim-boundary
 * Content-Disposition: form-data; name="prim-rpc"
 * 
 * { "method": "uploadFile", "params": ["_bin_some-identifier", "_cb_upload-progress"] }
 * --prim-boundary
 * Content-Disposition: form-data; name="_bin_some-identifier"; filename="hello.txt"
 * Content-Type: text/plain
 *
 * My name is Ted.
 * --prim-boundary--
 * ```
 * 
 * In this example, a single RPC call is made and a file is passed as the first parameter and the second is a callback
 * intended to show progress of the upload (let's pretend this file is much larger). This function is defined by the
 * user so the function call could have any structure. The call could look like this for example:
 * 
 * ```ts
 * const fileInput: HTMLInputElement = document.getElementById("file-input")
 * const file = new Blob([input.files[0]])
 * const result = await prim.uploadFile(file, progress => console.log("Progress:", progress))
 * console.log(result === "processing") // we'll know when finished by listening for events on callback
 * ```
 * 
 * When a file is passed as a parameter, the Prim client should be able to determine that it is a Blob/File and needs to
 * be treated separately. There should probably be an added restriction in Prim that binary data needs to be a direct
 * parameter of the function call so that objects don't need to be deeply inspected for binary data, similar to how
 * callbacks are only processed if they are a direct parameter of function (for example, 
 * `typeMessage("message", { cb: letter => console.log(letter) })` couldn't work because 2nd parameter is object).
 * 
 * The processing on the client should happen in the given plugin. A fourth parameter could be passed to the HTTP plugin
 * that is a helper function for creating FormData. This helper function could even be a separate plugin in itself,
 * like one to create FormData or if another format is chosen, a plugin to create that structure. The plugin
 * would need to look at parameters in the RPC call and replace them with an identifier prefixed `_bin_` to reference
 * the file in the FormData it creates. An example plugin using fetch is below:
 * 
 * ```ts
 * createPrimClient({
 *   client: async (endpoint, jsonBody, jsonHandler, formHandler) => {
 *     const form = formHandler?.(jsonBody)
 *     const body = form.data ?? jsonHandler.stringify(jsonBody)
 *     const headers = { "content-type": "application/json", ...form.headers }
 *     fetch(endpoint, { body, ... })
 *   }
 * })
 * ```
 * 
 * `formHandler` in this example reads jsonBody.params for Blobs and replaces them with and keeps track of references.
 * The found Blobs are then used to construct FormData that starts with modified RPC in `jsonBody` as the first field
 * and then any binary data as additional fields with the names of each field being a reference to the parameter
 * prefixed `_bin_`. The structure of this plugin should probably be rethought so it's easier to use but this would
 * at least be functional (I think).
 * 
 * The next part is processing this request on the server. Each plugin would need to opt-in to support reading given
 * multipart data. So, for instance in a Fastify plugin, I could toggle a plugin option, like `useMultipart` that would
 * let the plugin read form data, triggering the `.call()` method when the "prim-rpc" field is processed. The references
 * starting with `_bin_` would need to be replaced with some sort of event listener that would return a result to the
 * called function. This is difficult because Prim may have to dictate what format is used (likely a Buffer). However,
 * it's possible someone may want to read file as a whole (which would mean giving the function a promise), or someone
 * may just want the filename (also a promise but with the contents being a short string, the filename). This
 * transformation from input given to the multipart handler in a Prim Plugin to the format expected by the function
 * would probably need to be handled by the plugin. Since the type on the browser (probably a Blob) and server
 * (probably a Buffer or a Promise<string> containing the filename) will differ, the Prim client would also need to
 * transform these types so that the function can be defined with the intended type on the server but transformed on
 * the client (expanding the definition of `PromisifiedModule` today with custom type provided to Prim server over
 * some newly defined TypeScript generic, which is to say: this would become difficult fast).
 * 
 * However, if all of these parts could be implemented, then I could handle file uploads in Prim through the use
 * of plugins.
 * 
 * ## Alternatives
 * 
 * It's also worth noting alternatives to using multipart data. Multipart is the most widely supported, popular for
 * uploading files, and (relatively) simple which is why it's considered, in the same way JSON is chosen for RPC in
 * this project because supported, simple, and popular.
 * 
 * One alternative is BSON but I've yet to find a way to use this in the browser for file uploads and it's not supported
 * well (or at all for some) by server frameworks. This would be ideal since I can still think in terms of JSON however
 * even in a world where this is possible, it would probably be difficult to separate the file upload from the RPC call
 * meaning RPC responses would be delayed by the upload. However, I don't know enough about BSON to say for sure.
 *
 * There's also @msgpack/msgpack which is binary and may be easier to use in the browser. It's not as widely supported
 * but it appears to be easier to support than BSON. The problem is that I'm not sure that I can send that binary
 * data from a browser without using FormData. If I end up using FormData, this isn't an alternative but rather a
 * very similar solution to "Possible Implementation" above with the only difference being that the entire RPC
 * is sent as binary data instead of splitting it up by identifiers in the RPC.
 * 
 * Another alternative is to just upload files using the configured websocket. While it's easy to send binary data
 * over WebSocket, the request structure isn't as defined as it is with multipart data over HTTP, meaning that would
 * become a responsibility of this project (no thank you). This could implemented as a plugin for websocket connections 
 * (maybe) but to officially support would be very, very difficult.
 * 
 * A couple useable alternatives, and the options Prim will suggest for its first release, is to either:
 * 
 * - handle uploads in a custom Prim plugin (without direct Prim RPC integration, this would probably be hacky)
 * - upload very small files by base64 encoding them (not an option for larger files like images)
 * - upload files with your HTTP framework in a defined route outside of Prim
 */
let fileUploadsAsPartOfPrimPlugin: Status.PartiallyImplemented

/**
 * Support object variable types like `Date` over network requests with Prim by using a separate JSON
 * stringify/parsing library that can understand those requests. This is something that tRPC supports right now
 * through use of other modules. Prim should support this as well. In fact I may not even need direct support
 * through Prim since I allow usage of any HTTP or WS client.
 * 
 * In a custom client, given RPC could just be stringified and then result parsed using something like
 * "superjson" or "devalue".
 * 
 * It might be a good idea to support these in client-side Prim Plugins. Instead of just providing a function to be
 * called, I could encapsulate each client plugin with a function that provides options. This way I could pass in
 * a separate JSON parsing library (such as "superjson" or even something as simple as  "json-bigint") to the client.
 */
let customJsonHandling: Status.Implemented

/**
 * When a request comes into Prim Server, send the answer over a list of configured webhooks.
 * This can be done by using the client option configured with Prim except I'll just be using it from
 * the server to contact each configured endpoint. I could potentially allow for a filter on what answers
 * to forward to webhook endpoints (for instance, regex or glob that matches function names).
 * 
 * Webhooks can be complicated when you consider adding signatures, limiting sent webhooks to each endpoint, or
 * possibly restricting data sent back. It also varies for each server sending those webhooks.
 * 
 * These tasks should not be the responsibility of Prim Server but
 * rather some library dedicated to that functionality, especially since most developers probably won't generate their
 * own webhooks for RPC. Instead of sending webhooks directly with Prim's client, it might be worth considering adding
 * an event emitter on RPC calls that could be used in a generic way, for instance, to send webhooks.
 * 
 * A simple event handler may look like this (if more are added then I might consider
 * exposing emitter itself with syntax like `prim.on("...")`):
 * 
 * ```ts
 * const prim = createPrimServer({
 *   // using default `client` option in this Prim Server
 *   onCall: (rpc: RpcCall & RpcAnswer) {
 *     // do something (maybe send webhook to some list of configured endpoints)
 *   }
 * })
 * ```
 */
let webhooksOrEventEmitter: Status.Idea

/**
 * Use Prim for easy IPC. The way this would work is to set up a Prim Client on the renderer process that communicates
 * using an Electron-specific HTTP and WebSocket client that sends RPC to a dedicated method provided over the
 * contextBridge in the Electron preload script. The method (probably called `prim(rpc)`) will send/emit an event
 * called "prim" with an argument of the RPC. The main process will then accept this and forward to Prim Server which is
 * also configured on the main process.
 *
 * The Prim Server can then either be used to call a function locally in the main process or be used as a proxy
 * for another Prim Server (like a remote server) and send off that RPC. This way Prim can be used for:
 *
 * - requesting data from the server, without CORS errors in renderer, or resorting to turning off Electron's security
 *   features.
 * - requesting functions defined in main process from renderer without all of the duplicate code
 *
 * Note that the main process will need a handle for the event sent from the preload script. This should be a function
 * that returns the result gathered from the Prim Server (regardless of whether function is local to main process
 * or a call to a remote server).
 * 
 * NOTE: this will be best implemented as a "plugin" using "@doseofted/prim-plugins"
 */
let electronSupport: Status.Idea

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

export {}
