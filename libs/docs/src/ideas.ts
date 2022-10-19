enum Status { Idea, Implemented, PartiallyImplemented, Rejected, PartiallyRejected }
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * The documentation plugin today is based on generated TypeDoc documentation
 * from given code. This is useful for internal documentation and for functions
 * defined at runtime. This also separates documentation from code which is useful
 * for reducing the size of code since documentation may not always be needed.
 * 
 * However, compile-time documentation can be inflexible for certain type of programs
 * and may not always make sense when a program is intended to be used by some outside
 * developer who will require documentation (an API that is designed to be used externally).
 * 
 * For example, Prim CMS is intended to be very flexible and allow for the creation of new
 * content types at run-time. While I can document base functionalities with compile-time documentation,
 * created types would not have documentation (functions for content types would probably be instantiated
 * from a class or some other generating function that assigns to a property). To keep these dynamic
 * structures documented, runtime documentation, in addition to compile time would be
 * useful. It would look something like this:
 * 
 * ```ts
 * // no need for TypeDoc when using runtime docs
 * function create() {
 *   // ...
 * }
 * documentRpc(create, {
 *   // name could be overridden if function name differs from variable name
 *   // overrideName: "..."
 *   comment: "Create a thing"
 *   // all other properties would correspond with TypeDoc expected types (mostly JSDoc tags)
 *   // but be structured to match Prim RPC Docs format
 *   params: [
 *     {
 *       name: "title",
 *       comment: "Title of thing to create"
 *     }
 *   ],
 *   returns: {
 *     type: "string"
 *     comment: "the ID of created thing"
 *   },
 *   throws: {
 *     comment: "When creation fails"
 *   }
 * })
 * ```
 * 
 * This example could also be accomplished with a regular TypeDoc comment. However, if this
 * function was instantiated by some other function then it would need to be created at runtime.
 * Consider the example above in this context (quick and dirty example):
 * 
 * ```ts
 * const content = {}
 * function createContentType(name: string) {
 *   const newContentType = {
 *     create: createCreateType(name),
 *     read: createReadType(name),
 *     update: createUpdateType(name),
 *     remove: createRemoveType(name)
 *   }
 *   content[name] = newContentType
 * }
 * // below is an example of one of the functions called in `createContentType`
 * function createCreateType (name: string) {
 *   // a typedoc comment for closure wouldn't be useful
 *   function create() {
 *     // ...
 *   }
 *   // notice that `create` function for content type cannot have compile-time docs
 *   documentRpc(create, {
 *     comment: `Create a new ${name}`
 *     // ... more documentation
 *   })
 *   return create
 * }
 * ```
 * 
 * In this example, run-time documentation would help document each created type without the
 * need to rebuild or restart the server.
 * 
 * The `documentRpc` function simply creates a function as a property of another function
 * (since functions are objects). So this function would essentially be doing this:
 * 
 * ```ts
 * function documentRpc(givenFunction: (...args: unknown[]) => void, options: unknown) {
 *   // just an example, options would be processed in real usage
 *   givenFunc.docs = options
 * }
 * ```
 * 
 * One problem with this run-time documentation is that I would need to know the
 * name of the function to request its documentation. For instance, if I'm given
 * a list of functions generated from TypeDocs, I can request the documentation because
 * I know the location of the function, as given in the docs, established at compile time.
 * 
 * However, when a new a function created (like as a property of `content` in example above)
 * then I don't know what to request. I would probably need to scan a given module
 * deeply to determine if any functions created in it has a `.docs` property as created by `documentRpc()`.
 * This creates some additional work:
 * 
 *   - Scan given module on server deeply to find all functions defined
 *   - Check each function for a `docs` function defined on it
 *   - Given path of function in module (as used in Prim RPC, like `testLevel1/sayHello`),
 *     keep record of that function and its path so that a documentation UI knows where those functions are
 *   - From documentation UI, request paths of dynamic modules, merge with compile time
 *     documentation, and request `.docs()` of all dynamically defined functions.
 * 
 * Not impossible, but quite a bit of work. This also results in a lot of function
 * calls when documentation is requested because these steps have to be rerun on every
 * request for documentation (otherwise documentation could potentially be stale). This may be problematic
 * when there is a lot of code used with Prim RPC.
 * 
 * Because this is so much work and happens at run-time, it may be worth leaving documentation
 * of dynamically created functions to the developer and not include this functionality
 * as a core part of Prim RPC's documentation generator (to be decided).
 */
let runtimeDocumentation: Status.Idea

/**
 * The current structure for documentation as defined in `interfaces.ts` (at time of writing)
 * is going to make documentation hard to create. It may be relatively easy to consume from an interface
 * but it is complex to go through the various types of TypeDoc.
 * 
 * Documentation of a module used with Prim RPC really should only concern things with a call signature,
 * that is, functions or anything that can be called. For this reason, it may be worth considering a new
 * structure for documentation based only on functions.
 * 
 * Functions can be grouped by modules so this new structure should also consider that
 * kind of grouping. Functions could be grouped in a module (dedicated file) or a variable
 * (class instantiation or just object variable with functions as properties).
 * 
 * The new structure should just scan each nested TypeDoc declaration for a `.children` prop
 * (if declaration has `.kindString` of "Project" or "Namespace") or a `.type.declaration` when
 * the `.type.type` is "reflection" (and `.kindString` is "Variable", "Property" or other [TBD]).
 * 
 * For each nested declaration, I will look for call signatures to determine if given
 * object is a function (and used with Prim RPC) and then add that to the object at that level.
 * 
 * 
 * In this new structure, types would be referenced by each function instead of assigning
 * a reference to the function and defining the type in a separate object. This does mean
 * that types for each function will be duplicated for each method if used more than once but
 * this does make documentation simpler to create since I don't have to keep track of types.
 * 
 * As an example of documentation shape (in YAML so it's easier for me to type):
 * 
 * ```yaml
 * module:
 *   sayHello: # contains array of all possible call signatures
 *     - name: "sayHello" # add name as property, in case stored as reference
 *       comment: "Say hello, with options"
 *       params: # always array
 *         - name: options
 *           type: object # generic, string only
 *           typed: # specific type
 *             name: "string"
 *             greeting: "string"
 *           comment: "Options for greeting"
 *       returns:
 *         type: "string"
 *         comment: "A nice greeting"
 *       throws:
 *         type: "Error" # if given, but TypeDoc doesn't seem to return types defined in comments
 *         comment: "It doesn't throw but this is how that would be documented"
 * methods:
 *   - "sayHello"
 *   - "sayHelloAlternative"
 *   - "submodule/sayHello" # module is included in method path
 * modules:
 *   - "submodule"
 *   - "submodule/otherModule" # an example of nested module
 * ```
 * 
 * So the documentation would live under the root "module" key and defines the shape. All methods
 * and submodules are defined as keys of that object and this works for every submodule defined
 * under it.
 * 
 * The root "methods" and "modules" keys would contain references to their respective type
 * as a one-dimensional list with a path to that type. For a list item under "methods" called
 * "submodule/sayHello", I know that I would find details of this method under `module.submodule.sayHello`.
 * 
 * All "methods" and "modules" are only found after the "module" key has been created
 * since they're established by scanning the generated "module" key (if key in "module" contains another
 * object, consider it a module. If an array and every item has a "name" property, assume it's a method).
 * 
 * Types defined for methods also follow a similar structure. Individual Parameters, returns, and throw
 * values all will be an object with a `.comment` property. If a type is given, it will
 * be given on `.type` and will include the string name of a type (for instance, if given an interface, the
 * type would be "object"). If a type is given with additional data (like interfaces) then those
 * types will be defined on `.typed`. Since representing TypeScript types is difficult, I will only
 * represent basic types to keep documentation easy to parse. Some common types and how they
 * would be documented is given below in YAML:
 * 
 * ```yaml
 * # scalar types or native objects are represented by string
 * typed: "string"
 * typed: "Date"
 * # If optional, suffix with a "?"
 * typed: "string?"
 * # objects are given as objects, with types as values
 * typed:
 *   someProp: "string"
 *   anotherProp: "string?"
 *   propsWithProps:
 *     propHere: "number"
 * # Arrays are given as an array with one item, containing the type
 * typed: ["number"]
 * # Tuple-like objects contain multiple items
 * typed: ["number", "number"]
 * ```
 * 
 * The problem with this simplified way of representing types is that 
 * some types can't be represented (like how do I represent enumerations?).
 * For this reason, it may be worth making each type an object with a type property, like so:
 * 
 * ```yaml
 * # all examples below are equivalent with above
 * typed:
 *   type: "string"
 * typed:
 *   type: "Date"
 * typed:
 *   type: "string"
 *   optional: true
 * typed:
 *   type: "object"
 *   properties:
 *     someProp:
 *       type: "string"
 *     anotherProp
 *       type: "string"
 *       optional: true
 *     propsWithProps:
 *       type: "object"
 *       properties:
 *         propHere:
 *           type: "number"
 * typed:
 *   type: "array"
 *   items:
 *     - type: "number"
 * typed:
 *   type: "array"
 *   items:
 *     - type: "number"
 *     - type: "number"
 * # additional types could be represented with this structure like...:
 * # an enum
 * typed:
 *   type: "enum"
 *   members:
 *     - "PENDING"
 *     - "SUCCESS"
 *     - "FAILED"
 * # A "type" for the above "typed" property would be the name of the enum:
 * type: "StatusesEnum"
 * # union types
 * typed:
 *   - type: "string"
 *   - type: "object"
 *     properties:
 *       - someProperty: "string"
 *       - someOtherProp: "number"
 * # Above demonstrates "typed" but a "type" for a union would look like this:
 * type: ["string", "object"]
 * ```
 * 
 * This would allow more flexibility but is harder to read however It think it may be
 * worth it as long as rules for parsing are established and are consistent.
 */
let newDocumentationStructure: Status.Idea

/**
 * Implementing a JSON representation of types is difficult. TypeScript is the best format for utilizing types but
 * can't be easily read for the purpose of documentation. TypeDoc is the next best bet but even that can be difficult
 * to read and even if it can be read by a documentation tool, it can't be validated for any kind of interactive
 * documentation (without creating an additional tool for that express purpose).
 * 
 * JSON Schema would be a great tool for documenting types but it's intentionally very limited to support just JSON.
 * It's a great choice for a documentation tool because it's (relatively) easy to read, has available validators like
 * AJV, and is just generally popular and understood. It can also be serialized so that the schema can exist as a string
 * that could be sent over the network (this is important because run-time documentation could be sent over the network
 * this way, as described in `runtimeDocumentation`). A tool like Zod would be useful since it supports way more types
 * than JSON Schema but doesn't appear to serialize to a string except through other tools that interpret the Zod
 * schemas which are also very limited. It's also not a standard (just popular now and fairly recently)
 * 
 * That said, JSON Schema doesn't support even basic primitive types in JavaScript or advanced types like BigInt,
 * RegExp, or of course: functions, since Prim RPC supports callbacks. Of course, RPC doesn't support these either since
 * everything needs to be serialized. Maybe I'm thinking of documentation at the wrong level. While the documentation
 * tool should document types expected by the function, validations/schema may not need to document these types.
 * 
 * For instance, if a function expects a Date parameter then the documentation tool should reflect this. However, a Date
 * can't be sent over the network. If a Date parameter is used with Prim RPC then it's assumed that the JSON library
 * used with Prim supports serialization/deserialization of Dates. So, instead of validating the Date, I could simply
 * validate that the unknown type is a string. Of course this may not always be the case. Maybe there's a JSON library
 * that converts Dates into a JSON object. It can still be serialized into the RPC but I can't assume that type is
 * always a string.
 * 
 * So, it's hard to validate the actual RPC since usage of the RPC with Prim may require a certain JSON handler which
 * could transform that JSON in unpredictable ways (who knows, maybe it's even YAML). This flexibility of Prim makes
 * it harder to document any code that's used with it. This may mean that I should instead document types as shown
 * in generated TypeDoc. The reason I'm trying to avoid using TypeDoc output in the first place is because it's
 * complicated to read from the documentation (and I'd like to encourage new doc generators and themes which need
 * to be easy to develop).
 * 
 * In order to use JSON Schema, I would need to extend it. This seems to be allowed however JSON schema validators will
 * just skip these properties (note that AJV will actually fail on custom properties if strict mode is `true`).
 * By extending it I would need to make sure that established properties of JSON schema are valid. So, if I allow an
 * "undefined" type, the `.type` property in JSON Schema would need to be something else since "undefined" isn't 
 * allowed in the schema. Instead, I would need to create a custom property to document the actual type
 */
let restructuredTypes: Status.Rejected

/**
 * I'm thinking of types all wrong. This is too complicated. The documentation tool should simply display the name
 * of the type. When you see the string reference to the name, you should understand it. For instance, if you see
 * a parameter on a function with a type of "Date" then you know to pass a JavaScript Date. When you a return a value
 * of "string" you know to use a string. If a function expects one parameter named "options" which has an interface,
 * then the type is "object", not "interface" or the name of the interface. If a function accepts a callback, the type
 * is "function", not the actual typed call signature. Types should either be a primitive type or a reference to
 * an object. That's it.
 * 
 * TypeScript support or advanced schemas are too complicated. It's the reason I'm not using the
 * types provided through TypeDoc. Attempts to simplify this data will fail because TypeDoc is already summing up type
 * information. The problem is that this type information is complicated and even in it's simplest form will remain
 * complicated.
 * 
 * I still think types should still be supported to some degree, possibly even with very limited validation. One of the
 * biggest benefits of Prim RPC is that you get a typed client that's near identical to what you're actually requesting
 * from the server. The reason this works so well is because Prim RPC simply takes advantage of tools that exist today:
 * no additional languages like GraphQL's SDLs or Protobufs. I didn't need to create a separate language. If I start
 * adding types to this documentation tool, I won't be creating a new language but I would need to create some kind
 * of standard (even if not official or well structured) that can represent TypeScript types. That's too much for a
 * project in this stage.
 * 
 * These types provided to the client (TypeScript definitions from the server) also don't need to be validated in an
 * interactive documentation tool. That validation will already happen in the code so duplicating that functionality
 * in a user interface that is simply used to document code wouldn't be super useful. Instead it's useful to provide
 * definitions in a way that can be viewed, so that you can understand what's expected (if expected type is an object,
 * it may be useful to know what shape/structure that object should take) but this doesn't need to be validated.
 * The code already should do that if types are provided to the client. TypeScript does this well (arguably). I don't
 * need to recreate the same kind of type restrictions in a documentation tool. Instead, I can provide some basic
 * type information using a simpler interface resembling JSON Schema but not necessarily JSON Schema. This way I don't
 * have to follow a restrictive standard to take advantage of some other tool's validation logic but I can still
 * show types in documentation (they just won't validated from the documentation UI).
 */
let typesForReal: Status.Idea

/**
 * Create a module for Prim that reads the result of module's TypeDoc, or the Prim RPC docs generated from a TypeDoc,
 * directly and use this to create methods available to call from the server that return JSON schema for those requests.
 * This would allow a developer to create a JSON file and specify a "$schema" property and then get typed results like
 * they would as if they were using TypeScript. This would allow non-JavaScript-based languages to get typed suggestions
 * just as they would in TypeScript. This is comparable to GraphQL language support where extensions may provide
 * autocompleted suggestions based on the GraphQL schema.
 * 
 * Say you have a module that exports one method:
 * 
 * ```ts
 * // file: module.ts (docs are generated at `module-docs.json`)
 * export default { hello: (name) => `Hello ${name}` }
 * // file: prim-rpc.ts
 * import module from "./module.ts"
 * import moduleDocs from "./module-docs.json"
 * createPrimServer({
 *   prefix: "/prim"
 *   module,
 *   docs: primRpcSchema(moduleDocs)
 * })
 * ```
 * 
 * The new function provided by Prim RPC Docs is `primRpcSchema()`. This function would take the documentation and
 * create a JSON schema available at `/docs/...` routes. So if a developer specified a JSON file below, the RPC would
 * be typed and become automatically suggested by code editors supporting JSON schema. This would include not just
 * the structure of the RPC (like method, params) but also the parameters expected (like arg0 is of type string).
 * 
 * ```json
 * {
 *   "$schema": "http://localhost:3000/prim/docs/hello",
 *   "method": "hello",
 *   "params": ["Ted"],
 * }
 * ```
 * 
 * If this function had multiple call signatures, then those would be listed in the schema using a discriminator that
 * would specify multiple schemas for that method.
 * 
 * This may also be applied to batch requests. The problem today is that batched requests use a top-level array in
 * request bodies which means that the "$schema" property can't be specified. For this to work, I would need to
 * restructure the body to have a top-level "methods" keys which contains an array of RPCs. This would allow me to
 * create a JSON file like so:
 * 
 * ```json
 * {
 *   "$schema": "http://localhost:3000/prim/docs",
 *   "methods": [
 *     {
 *       "method": "hello",
 *       "params": ["Ted"],
 *     },
 *     {
 *       "method": "hello",
 *       "params": ["Not Ted"],
 *     }
 *   ]
 * }
 * ```
 * 
 * On second thought, batched requests may be difficult since any item contained in methods key would then need some
 * sort of discriminator to determine the types of parameters, based on the method name. I know JSON Schema can support
 * these kinds of discriminators so it's just a matter of how difficult it is to write code that generates this schema
 * based on the given documentation (probably not too difficult but it may take some time).
 * 
 * **Note:** this feature depends on JSON schema for individual methods in generated docs to be written (adding a
 * `.typed` field to each method). This is planned but not ready yet. Once this feature is ready, I can start working
 * on implementing this idea.
 */
let typedQueriesWithJsonSchema: Status.Idea

export {}
