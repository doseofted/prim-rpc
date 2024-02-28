// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { createUnplugin } from "unplugin"
import { defu } from "defu"
import { parse } from "@babel/parser"
import traverse, { type NodePath } from "@babel/traverse"
import type { FunctionDeclaration, VariableDeclaration } from "@babel/types"

export interface RpcCompileOptions {
	/**
	 * The import path of your Prim+RPC client. This client must be the default export and will be used in place of your
	 * function declarations. If not provided, a default client using fetch/websocket plugins will be created.
	 */
	clientImport?: string
}

const defaultOptions: Partial<RpcCompileOptions> = {}

/** Readable yet unique name to give potential RPC functions */
function functionWithScope(name: string, scope: number) {
	return `${scope}:${name}()`
}

/** Keep reference of found functions that are potentially RPC */
type DeclarationReferences = {
	[uniqueFunctionId: string]:
		| {
				type: "function"
				name: string
				scope: number
				path: NodePath<FunctionDeclaration>
		  }
		| {
				type: "variable"
				name: string
				scope: number
				path: NodePath<VariableDeclaration>
		  }
}

/**
 * **Experimental:** take caution and review generated code before any deployment. This plugin is not yet stable.
 *
 * Allow server-side functions to exist beside client-side code. This plugin will search for functions marked as inline
 * RPC and move them into a virtual import that you can utilize in your Prim+RPC server. All inline RPC functions will
 * be replaced with a call to that RPC using your provided Prim+RPC client.
 *
 * In detail, the plugin will do the following:
 *
 * - Search for functions marked as inline RPC ("rpc" property of function must be set to "inline")
 * - Replace function declaration with a call using provided Prim+RPC client (import path provided in plugin options)
 *   - Ensure function body utilizes only variables in scope or variables for server environment (no context sharing)
 *   - Remove RPC property from code
 * - Move function declaration to a new file, give unique and predictable name and keep reference (and add exports)
 * - Create new virtual import containing moved functions (to be used by developer setting up Prim+RPC server)
 *
 * Inline RPC functions must be marked with `function.rpc = "inline"` and can only use variables in its defined scope
 * or defined for the server environment. Prim+RPC and this plugin are flexible, so this environment may be a literal
 * server, web worker, or another browser.
 */
export const inlineRpcPlugin = createUnplugin((options: RpcCompileOptions) => {
	const _configured = defu(options, defaultOptions)
	return {
		name: "unplugin-prim-compiler",
		transform: (code, _id) => {
			const parsed = parse(code, { sourceType: "module" })
			const functionDeclarations: DeclarationReferences = {}
			const functionRpc: Record<string, boolean> = {}
			traverse(parsed, {
				/** find `function func () {}` */
				FunctionDeclaration(path) {
					const functionName = path.node.id.name
					const scopeId = path.scope.parent.uid
					const functionUnique = functionWithScope(functionName, scopeId)
					functionDeclarations[functionUnique] = { type: "function", path, name: functionName, scope: scopeId }
				},
				/** find `const func = function () {}` and `const func = () => {}` */
				VariableDeclaration(path) {
					for (const declaration of path.node.declarations) {
						const declaredFuncExpression =
							declaration.type === "VariableDeclarator" &&
							declaration.id.type === "Identifier" &&
							["ArrowFunctionExpression", "FunctionExpression"].includes(declaration.init.type) &&
							declaration
						const variableName =
							declaredFuncExpression &&
							declaredFuncExpression.id.type === "Identifier" &&
							declaredFuncExpression.id.name
						if (!variableName) continue
						const functionUnique = functionWithScope(variableName, path.scope.uid)
						const scopeId = path.scope.uid
						functionDeclarations[functionUnique] = { type: "variable", name: variableName, path: path, scope: scopeId }
					}
				},
				/** find `func.rpc = true` */
				ExpressionStatement(path) {
					const assignmentFound =
						path.node.expression.type === "AssignmentExpression" &&
						path.node.expression.operator === "=" &&
						path.node.expression
					const memberAssignmentFound =
						assignmentFound && assignmentFound.left.type === "MemberExpression" && assignmentFound.left
					const rpcPropertyGiven =
						memberAssignmentFound &&
						memberAssignmentFound.property.type === "Identifier" &&
						memberAssignmentFound.property.name === "rpc"
					const rpcIdentifier =
						rpcPropertyGiven &&
						memberAssignmentFound &&
						memberAssignmentFound.object.type === "Identifier" &&
						memberAssignmentFound.object.name
					const rpcValue =
						rpcPropertyGiven && assignmentFound.right.type === "BooleanLiteral" && assignmentFound.right.value === true
					const isMarkedRpc = rpcIdentifier && rpcValue
					if (!isMarkedRpc) return
					const scopeId = path.scope.uid
					const functionUnique = functionWithScope(rpcIdentifier, scopeId)
					functionRpc[functionUnique] = isMarkedRpc
				},
			})
			const rpcFunctions = Object.keys(functionRpc)
				.map(functionUniqueName => functionDeclarations[functionUniqueName])
				.filter(given => given)
			const rpcFunctionIdentifiers = rpcFunctions.map(
				func => `${func.type}:${functionWithScope(func.name, func.scope)}`
			)
			console.debug("RPC:", rpcFunctionIdentifiers)
			// for (const rpcFunction of rpcFunctions) {
			// 	traverse(rpcFunction.path.node, {})
			// }
			return { code }
		},
	}
})
export default inlineRpcPlugin
