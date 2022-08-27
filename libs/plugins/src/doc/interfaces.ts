// /** test */
// type TypeRef = string
// interface Documented {
// 	/** Comment for given type using Markdown */
// 	comment: string
// 	/** A unique identifier to reference this object */
// 	id: number
// 	/** A categorization for type as recognized by documentation */
// 	categorization: "Method"|"Param"|"Returns"|"Thrown"|"Module"
// 	type: TypeRef
// }
// interface Returns extends Documented {
// 	categorization: "Returns"
// }

// interface Param extends Documented {
// 	categorization: "Param"
// }

// interface MethodOverload {
// 	comment: string
// 	params: Param[]
// 	result: Returns
// 	throws: Returns
// }

// export interface PrimRpcModule {
// 	[name: string]: {
// 		type: "Method"|"Module"
// 		module?: PrimRpcModule
// 		method?: MethodOverload[]
// 	}
// }

// export interface TypeDocumented {
// 	/** Either a primitive value or an object.  */
// 	type: string
// 	ref: string
// 	object?: PrimObjectType
// 	array?: TypeDocumented[]
// }

// export interface PrimObjectType {
// 	[name: string]: TypeDocumented
// }

// export interface PrimRpcDocs {
// 	/** Methods exported from modules that can be called */
// 	module: PrimRpcModule
// 	/** Types referenced from RPC calls */
// 	types: PrimObjectType
// }


// TRY 2

interface Param {
	/** Parameter name */
	name: string
	/** A type as defined on Prim Docs's root object */
	type: TypeRef
	/** Identifier used to access name given by `.type` */
	id: string
	/** Comment for parameter value */
	comment: string
}

interface Returned {
	/** A type as defined on Prim Docs's root object */
	type: TypeRef
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
	params: Param[],
	/** Return type of the method */
	returns: Returned,
	/** The type of error that is thrown directly by (and only by) this method */
	throws: Returned
}

interface RpcTypeDocs {
	/** Value of `intrinsic` will determine what property on object should be accessed */
	intrinsic: "type"|"object"|"array"
	/** If not an object or array, `.type` is the type of parameter expected native, to the language */
	type?: string
	/** If given type has properties, they will be listed under `.object` */
	object?: {
		[prop: string]: RpcTypeDocs
	},
	/** If given type is an array (or tuple-like), types will be listed under `.array` */
	array?: RpcTypeDocs[],
}

interface RpcDocReferences {
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
type TypeRef = keyof RpcDocReferences

interface Shape {
	/** Either a method name or property used to access a submodule */
	[property: string]: {
		/** Type used to access Prim Docs' properties and find a specific ID */
		type: TypeRef
		/** ID used to reference root property named with value of `.type` on Prim Docs root object */
		id: string
		/** If given option has properties, those will be nested under `.shape` */
		shape: Shape
	}
}

/** Prim RPC documentation, generated from a TypeDoc export */
export interface RpcDocs extends RpcDocReferences {
	/** The shape of the module including direct methods and any nested modules */
	shape: Shape
}
