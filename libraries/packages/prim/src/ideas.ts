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
 * const { sayHello } = createPrimUniveral<typeof moduleServer>({ ...options }, {
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
let reactiveInterfaceIdea: unknown

/**
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
let batchRequests: unknown

/**
 * Allow uploads of images by supporting multipart form data. Each field could be considered a property of an object
 * parameter to a function. So, for instance if a form exists on a page with an action `/prim/createProfile`,
 * (or `/prim/create-profile` if I support camel-case -> url conversion of function names), and that is a request to
 * the Prim Server, then a field named "profilePciture" would be passed as `{ profilePicture: Buffer }` on the server.
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
 * fastify.register(primFasifyPlugin, { prim, multipart: "fastify-multipart" })
 * ```
 * 
 * This way, I know where on the request I can expect to find the file. This may be too complciated initially.
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
let imageUploadsAndFormSupport: unknown

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
let nextIdea: unknown

/**
 * When a request comes into Prim Server, send the answer over a list of configured webhooks.
 * This can be done by using the clinet option configured with Prim except I'll just be using it from
 * the server to contact each configured endpoint. I could potentially allow for a filter on what answers
 * to forward to webhook endpoints (for instance, regex or glob that matches function names)
 */
let webhooks: unknown
