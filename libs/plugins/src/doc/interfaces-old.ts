export interface RpcParam {
	/** Parameter name */
	name: string
	/** A type as defined on Prim Docs's root object */
	ref: PrimDocRootRef
	/** Identifier used to access name given by `.type` */
	id: string
	/** Comment for parameter value */
	comment: string
}

export interface RpcReturns {
	/** A type as defined on Prim Docs's root object */
	ref: PrimDocRootRef
	/** Identifier used to access name given by `.type` */
	id: string
	/** Comment for return value */
	comment: string
}

// NOTE: it doesn't appear TypeDoc returns the type given to `@throws` comment
export interface RpcThrows {
	/** Condition on which functions throws, a comment */
	comment: string
}

export interface RpcMethodDocs {
	/** Method name */
	name: string
	/** Comment given for the method */
	comment: string
	/** Parameters expected by this overload of the method */
	params: RpcParam[],
	/** Return type of the method */
	returns: RpcReturns,
	/** The type of error that is thrown directly by (and only by) this method */
	throws: RpcThrows
}

export interface RpcTypeDocs {
	/** Value of `intrinsic` will determine what property on object should be accessed */
	intrinsic: "type"|"object"|"array"
	/** If not an object or array, `.type` is the type of parameter expected, native to the language */
	type?: string
	/** If given type has properties, they will be listed under `.object` */
	object?: {
		[prop: string]: RpcTypeDocs
	},
	/** If given type is an array (or tuple-like), types will be listed under `.array` */
	array?: RpcTypeDocs[],
}

export interface RpcMethodDocsById {
	[id: string]: RpcMethodDocs[] // potentially multiple call signatures
}

export interface RpcTypeDocsById {
	[id: string]: RpcTypeDocs
}

export interface PrimRpcDocReferences {
	/** Methods grouped by a generated identifier. Objects with call signatures */
	method: RpcMethodDocsById,
	/** All types referenced in methods on module, grouped by generated identifiers */
	type: RpcTypeDocsById
}
/** A type that is recognized by `PrimDocReferences` and has values */
export type PrimDocRootRef = keyof PrimRpcDocReferences|"shape"|"unknown"

export interface PrimRpcModuleShapeGiven {
	/** Type used to access Prim Docs' properties and find a specific ID */
	ref: PrimDocRootRef
	/** ID used to reference root property on Prim Docs object */
	id: string
	/** If given option has properties, those will be nested under `.shape` */
	shape?: PrimRpcModuleShape
}

export interface PrimRpcModuleShape {
	/** Either a method name or property used to access a submodule */
	[property: string]: PrimRpcModuleShapeGiven
}

/** Prim RPC documentation, generated from a TypeDoc export */
export interface PrimRpcDocs extends PrimRpcDocReferences {
	/** Name of the module (package name) */
	moduleName: string
	/** The shape of the module including direct methods and any nested modules */
	shape: PrimRpcModuleShape
}
