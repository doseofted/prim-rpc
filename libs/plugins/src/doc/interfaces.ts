type TypeRef = string
interface Documented {
	comment: string
	id: number
	docType: "Method"|"Param"|"Returns"|"Thrown"|"Module"
	type: TypeRef
}
interface Returns extends Documented {
	docType: "Returns"
}

interface Param extends Documented {
	docType: "Param"
}

interface MethodOverload {
	comment: string
	params: Param[]
	result: Returns
	throws: Returns
}

interface RpcDocModuleBase {
	/** Methods defined on the module */
	methods: {
		[method: string]: MethodOverload[]
	}
	/** Other modules referenced in this module */
	modules: {
		[submodule: string]: RpcDocModuleBase
	}
}

export interface RpcDocModule extends RpcDocModuleBase {
	/** Types referenced in methods, only at root of documentation */
	types: {
		[identifier: TypeRef]: Documented
	}
}
