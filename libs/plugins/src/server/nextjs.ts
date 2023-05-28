// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerMethodHandler } from "@doseofted/prim-rpc"
import type { NextApiRequest, NextApiResponse } from "next"

interface SharedFastifyOptions {
	contextTransform?: (req: NextApiRequest, res: NextApiResponse) => unknown
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MethodNextjsOptions extends SharedFastifyOptions {
	// ...
}

interface PrimNextjsExports {
	methodHandler: PrimServerMethodHandler
	config: {
		api: {
			bodyParser: boolean
			// externalResolver: boolean
		}
	}
	routeExport: (req: NextApiRequest, res: NextApiResponse) => void
}

// NOTE: since the route configuration for Next.js API routes is file based, it may not make sense
// to expose a "method handler" for use by Prim+RPC but rather to expose the API route directly
// and call on the Prim server from that route

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createMethodHandler = (options: MethodNextjsOptions): PrimNextjsExports => {
	// const { contextTransform } = options
	return {
		methodHandler: _prim => {
			// ...
		},
		config: {
			api: {
				bodyParser: false, // this will be handled by Prim
			},
		},
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
		routeExport: (req: NextApiRequest, res: NextApiResponse) => {},
	}
}
