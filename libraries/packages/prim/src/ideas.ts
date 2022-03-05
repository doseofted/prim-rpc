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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let reactiveInterfaceIdea: unknown
