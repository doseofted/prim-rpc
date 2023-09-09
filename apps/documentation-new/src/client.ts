import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin } from "@doseofted/prim-rpc-plugins/browser"
import type * as Functions from "@/functions"

const endpoint = import.meta.env.SSR ? "" : "/prim"
const module = import.meta.env.SSR ? import("@/functions") : null
const methodPlugin = createMethodPlugin()
export const client = createPrimClient<Promise<typeof Functions>>({ endpoint, module, methodPlugin })
