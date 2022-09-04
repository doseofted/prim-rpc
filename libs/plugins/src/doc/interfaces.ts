export type TypeKindRestricted = "object"|"primitive"|"interface"|"array"|"enum"|"function"
/** Properties given in most properties of documentation */
export interface TsTypeCommon {
	/**
	 * Comment, if any, given on the type and usually formatted as Markdown
	 */
	comment?: string
}
/** Properties that usually deal with types */
export interface TsTypeBase extends TsTypeCommon {
	/**
	 * The name of the type. It could be:
	 * 
	 *   - A primitive type like "string" or "number"
	 *   - An object like "Date" or "Error"
	 *   - A defined type like an interface/type/enum in TypeScript
	 */
	name: string
	/**
	 * The kind of type given. This is used to determine what properties are given
	 * on some given type. For instance, if "kind" is "object" then you may expect
	 * to find a property named "properties" to describe that object.
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
export interface PrimRpcThrow extends TsTypeCommon {}
/** Return value type for function with comment specific to function */
export interface PrimRpcReturn extends TsTypeCommon {
	type: TsType[]
}
/** Parameter for function with comment specific to function  */
export interface PrimRpcParam extends TsTypeCommon {
	type: TsType[]
}
/** A call signature for a function. Usually there is only one but a function could be overloaded */
export interface PrimRpcSignature extends TsTypeCommon {
	/** Name of the function, same for all call signatures */
	name: string
	/** Parameters expected by function */
	params: PrimRpcParam[]
	/** Return value for function */
	returns: PrimRpcReturn
	/** Throw condition, if any is given */
	throws: PrimRpcThrow
}

export interface PrimRpcStructure {
	/** The name of a module/module-like variable or a method name on that module */
	[moduleOrMethodName: string]: PrimRpcStructure|PrimRpcSignature[]
}

/**
 * Functions used as RPC, organized by module and documented.
 */
export interface PrimRpcDocs {
	/**
	 * The module structure, including submodules, and all of its methods.
	 * 
	 * To navigate the structure, loop through object entries.
	 * If given object value is an object, it is a submodule and if it is an array
	 * then it is a list of call signatures for a function defined on the module.
	 */
	structure: PrimRpcStructure
	/**
	 * A list of method paths in the module as a one-dimensional list to easily
	 * find method names in the given `.structure`. Path separator is "/".
	 * 
	 * This can be easily used with the "get" method provided in libraries like
	 * [Lodash](https://lodash.com/docs#get) or
	 * [Just](https://github.com/angus-c/just#just-safe-get).
	 */
	methods: string[]
	/**
	 * A list of module paths in the module as a one-dimensional list to easily
	 * find module names in the given `.structure`. Path separator is "/".
	 * 
	 * This can be easily used with the "get" method provided in libraries like
	 * [Lodash](https://lodash.com/docs#get) or
	 * [Just](https://github.com/angus-c/just#just-safe-get).
	 */
	modules: string[]
}
