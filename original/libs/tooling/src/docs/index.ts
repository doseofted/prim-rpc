// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { createDocsForModule } from "./generator"
import { findDocsReference, getFunctionForDocumentation, iterateDocs } from "./helpers/read"

const helpers = { findDocsReference, getFunctionForDocumentation, iterateDocs }
export { createDocsForModule, helpers }

export type { PrimRpcDocs } from "./interfaces"
