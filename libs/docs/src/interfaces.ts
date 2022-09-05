import { JSONSchema7 } from "@types/json-schema"

/**
 * the kind determines what properties are associated with given kind
 * 
 * - **primitive:** refers to built-in types, like `string` or `number`
 * - **reference:** refers to some established object, like `Date` or `Error`
 * - **type:** refers to a TypeScript-specific type described by `.type`
 */
export type TypeKindRestricted = "primitive"|"reference"|"type"
export interface GivenHasComment {
	/**
	 * Comment, if any, given on the type and usually formatted as Markdown
	 */
	comment?: string
	/**
	 * Flags are special comments with a name and a boolean value
	 */
	flags?: {
		[flag: string]: boolean
	}
}
/** Properties that usually deal with types */
export interface TsTypeBase extends GivenHasComment {
	/**
	 * The name of the type. It could be:
	 * 
	 *   - A primitive type when `.kind` is "primitive"
	 *   - A reference when `.kind` is "reference"
	 *   - A defined type with a name
	 */
	name: string
	/**
	 * The kind of type given. This is used to determine what properties are given
	 * on some given type. For instance, if `kind` is "type" then you may expect
	 * to find a type.
	 */
	kind: TypeKindRestricted
	/**
	 * Given type can be omitted when `true`
	 */
	optional?: true
}
/** Variant of `TsTypeBase` specific to given `.kind` */
export interface TsTypeSimple extends TsTypeBase {
	kind: "object"|"primitive"
}
/** Variant of `TsTypeBase` specific to given `.kind` */
export interface TsTypeInterface extends TsTypeBase {
	kind: "interface"
	/** Properties defined on the interface */
	properties: {
		[key: string|number|symbol]: TsType
	}
}
/** Variant of `TsTypeBase` specific to given `.kind` */
export interface TsTypeArray extends TsTypeBase {
	kind: "array"
	/** Determine if given type is intended to be used as a tuple or list */
	tuple: boolean
	items: TsType[]
}
/** Variant of `TsTypeBase` specific to given `.kind` */
export interface TsTypeEnum extends TsTypeBase {
	kind: "enum"
	/** Members of enum given as key-value pairs */
	members: {
		[name: string]: string|number
	}
}
/** Variant of `TsTypeBase` specific to given `.kind` */
export interface TsTypeFunction extends TsTypeBase {
	kind: "function"
	signatures: PrimRpcSignature[]
}
/** A type for documentation that may be narrowed down to a specific kind */
export type TsType = TsTypeSimple|TsTypeInterface|TsTypeArray|TsTypeEnum|TsTypeFunction

/** Details concerning a throw directly from a given function */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PrimRpcThrow extends GivenHasComment {}
/** Return value type for function with comment specific to function */
export interface PrimRpcReturn extends GivenHasComment {
	type: JSONSchema7
}
/** Parameter for function with comment specific to function  */
export interface PrimRpcParam extends GivenHasComment {
	name: string
	type: JSONSchema7
}
/** A call signature for a function. Usually there is only one but a function could be overloaded */
export interface PrimRpcSignature extends GivenHasComment {
	/** Name of the function, same for all call signatures */
	name: string // NOTE: name is already given in `PrimRpcStructure` key but provided here for easy access
	/** Parameters expected by function */
	params: PrimRpcParam[]
	/** Return value for function */
	returns: PrimRpcReturn
	/** Throw condition, if any is given */
	throws: PrimRpcThrow
}

export interface PrimRpcStructure extends GivenHasComment {
	/** The name of the module-like structure. */
	name: string // NOTE: name is already given in `PrimRpcStructure` key but provided here for easy access
	/**
	 * The module structure, including submodules, and all of its methods.
	 * 
	 * To navigate the structure, loop through object entries.
	 * If given object value is an object, it is a submodule and if it is an array
	 * then it is a list of call signatures for a function defined on the module.
	 */
	structure: {
		/** The name of a module/module-like variable or a method name on that module */
		[moduleOrMethodName: string]: PrimRpcStructure|PrimRpcSignature[]
	}
}

/**
 * Functions used as RPC, organized by module and documented.
 */
export interface PrimRpcDocs extends PrimRpcStructure {
	/**
	 * A list of method paths in the module as a one-dimensional list to easily
	 * find method names in the given `.structure`. Path separator is "/".
	 * 
	 * This can be easily used with the "get" method provided in libraries like
	 * [Lodash](https://lodash.com/docs#get) or
	 * [Just](https://github.com/angus-c/just#just-safe-get).
	 * 
	 * Below is an an example of using a given method path to find details in `.structure`:
	 * 
	 * ```ts
	 * // methodPath == "submodule/sayHello"
	 * const path = methodPath.split("/").map(path => ["structure", path]).flat()
	 * // path == ["structure", "submodule", "structure", "sayHello"]
	 * const foundDocumentation = get(docs, path) // `docs` is generated RPC docs
	 * ```
	 */
	methods: string[]
	/**
	 * A list of module paths in the module as a one-dimensional list to easily
	 * find module names in the given `.structure`. Path separator is "/".
	 * 
	 * This can be easily used with the "get" method provided in libraries like
	 * [Lodash](https://lodash.com/docs#get) or
	 * [Just](https://github.com/angus-c/just#just-safe-get).
	 * 	 * Below is an an example of using a given method path to find details in `.structure`:
	 * 
	 * ```ts
	 * // modulePath == "submodule/sayHello"
	 * const path = modulePath.split("/").map(path => ["structure", path]).flat()
	 * // path == ["structure", "submodule", "structure", "sayHello"]
	 * const foundDocumentation = get(docs, path) // `docs` is generated RPC docs
	 * ```
	 */
	modules: string[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const example: PrimRpcDocs = {
	name: "@doseofted/prim-example",
	comment: "Test ",
	methods: [
		"sayHello",
	],
	modules: [],
	structure: {
		sayHello: [
			{
				name: "sayHello",
				params: [{
					name: "greeting",
					type: {
						type: "string",
					},
				}, {
					name: "name",
					type: {
						type: "string",
					},
				}],
				returns: {
					comment: "A nice greeting",
					type: {
						type: "string",
					},
				},
				throws: {
					comment: "",
				},
			},
		],
	},
}