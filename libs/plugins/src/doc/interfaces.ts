interface RpcParam {
	/** Parameter name */
	name: string
	/** A type as defined on Prim Docs's root object */
	type: PrimDocRootRef
	/** Identifier used to access name given by `.type` */
	id: string
	/** Comment for parameter value */
	comment: string
}

interface RpcReturned {
	/** A type as defined on Prim Docs's root object */
	type: PrimDocRootRef
	/** Identifier used to access name given by `.type` */
	id: string
	/** Comment for return or thrown value */
	comment: string
}

interface RpcMethodDocs {
	/** Method name */
	name: string
	/** Comment given for the method */
	comment: string
	/** Parameters expected by this overload of the method */
	params: RpcParam[],
	/** Return type of the method */
	returns: RpcReturned,
	/** The type of error that is thrown directly by (and only by) this method */
	throws: RpcReturned
}

interface RpcTypeDocs {
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

interface PrimRpcDocReferences {
	/** Methods grouped by a generated identifier. Objects with call signatures */
	method: {
		[id: string]: RpcMethodDocs
	},
	/** All types referenced in methods on module, grouped by generated identifiers */
	type: {
		[id: string]: RpcTypeDocs
	}
}
/** A type that is recognized by `PrimDocReferences` and has values */
type PrimDocRootRef = keyof PrimRpcDocReferences

interface PrimRpcModuleShape {
	/** Either a method name or property used to access a submodule */
	[property: string]: {
		/** Type used to access Prim Docs' properties and find a specific ID */
		type: PrimDocRootRef
		/** ID used to reference root property named with value of `.type` on Prim Docs root object */
		id: string
		/** If given option has properties, those will be nested under `.shape` */
		shape: PrimRpcModuleShape
	}
}

/** Prim RPC documentation, generated from a TypeDoc export */
export interface PrimRpcDocs extends PrimRpcDocReferences {
	/** The shape of the module including direct methods and any nested modules */
	shape: PrimRpcModuleShape
}
