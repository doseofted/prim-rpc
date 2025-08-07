import { createPrimClient } from "@doseofted/prim-rpc"
import { createMethodPlugin } from "@doseofted/prim-rpc-plugins/browser"
import type * as Functions from "@/server"

const endpoint = import.meta.env.SSR ? "" : "/prim"
const module = import.meta.env.SSR ? import("@/server") : null
const methodPlugin = createMethodPlugin()
export const client = createPrimClient<Promise<typeof Functions>>({ endpoint, module, methodPlugin })
