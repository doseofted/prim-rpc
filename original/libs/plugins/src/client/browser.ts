// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

// This is only to address issue of developer having multiple imports for APIs available to the browser
export { createMethodPlugin } from "./browser-fetch"
export { createCallbackPlugin } from "./browser-websocket"
