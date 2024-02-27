// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { createUnplugin } from "unplugin"
import { defu } from "defu"
import { parse } from "@babel/parser"
import traverse, { type NodePath } from "@babel/traverse"
import type { FunctionDeclaration } from "@babel/types"

export interface RpcCompileOptions {}

const defaults: Partial<RpcCompileOptions> = {}

function functionWithScope(name: string, scope: number) {
	return [name, scope].join("_")
}

export default createUnplugin((options: RpcCompileOptions) => {
	const _configured = defu(options, defaults)
	return {
		name: "unplugin-prim-compiler",
		transform: (code, _id) => {
			const parsed = parse(code, { sourceType: "module" })
			const functionDeclarations: Record<string, NodePath<FunctionDeclaration>> = {}
			const functionRpc: Record<string, boolean> = {}
			traverse(parsed, {
				FunctionDeclaration(path) {
					const functionName = path.node.id.name
					const scopeId = path.scope.parent.uid
					const functionUnique = functionWithScope(functionName, scopeId)
					functionDeclarations[functionUnique] = path
				},
				VariableDeclaration(path) {
					const functionDeclarations = path.node.declarations.map(
						decl =>
							decl.type === "VariableDeclarator" &&
							decl.id.type === "Identifier" &&
							["ArrowFunctionExpression", "FunctionExpression"].includes(decl.init.type) &&
							decl
					)
					const functionNames = functionDeclarations.map(decl => decl.id.type === "Identifier" && decl.id.name)
					console.log("VariableDeclaration", functionNames)
				},
				// ArrowFunctionExpression(path) {
				// 	console.log("ArrowFunctionExpression", path.node)
				// },
				// FunctionExpression(path) {
				// 	console.log("FunctionExpression", path.node)
				// },
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
					console.debug("RPC property found", functionUnique)
				},
			})
			const functions = Object.keys(functionRpc)
				.map(functionUniqueName => functionDeclarations[functionUniqueName])
				.filter(given => given)
			console.log(
				"RPC functions:",
				functions.map(func => func.node.id.name + "(): " + func.scope.parent.uid)
			)
			return { code }
		},
	}
})
