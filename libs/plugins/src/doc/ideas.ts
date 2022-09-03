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

export {}
