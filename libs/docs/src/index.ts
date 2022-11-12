import { createDocsForModule } from "./generator"
import { findDocsReference, getFunctionForDocumentation, iterateDocs } from "./helpers/read"

const helpers = { findDocsReference, getFunctionForDocumentation, iterateDocs }
export { createDocsForModule, helpers }
