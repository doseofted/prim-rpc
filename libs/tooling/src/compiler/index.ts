// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { createUnplugin } from "unplugin"
import { defu } from "defu"
import { parse } from "@babel/parser"
import traverse, { type NodePath } from "@babel/traverse"
import type { FunctionDeclaration, VariableDeclaration } from "@babel/types"

export interface RpcCompileOptions {}

const defaults: Partial<RpcCompileOptions> = {}

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

export default createUnplugin((options: RpcCompileOptions) => {
	const _configured = defu(options, defaults)
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
			const rpcFunctionIdentifiers = rpcFunctions.map(func => functionWithScope(func.name, func.scope))
			console.debug("RPC:", rpcFunctionIdentifiers)
			return { code }
		},
	}
})
