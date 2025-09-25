import { createPrimServer } from "@doseofted/prim-rpc"
import { defineAstroPrimHandler } from "@doseofted/prim-rpc-plugins/astro"
import * as module from "@/server"

export const prerender = false

const prim = createPrimServer({ module })
export const { GET, POST } = defineAstroPrimHandler({ prim })
