---
"@doseofted/prim-rpc": minor
---

RPC can no longer be made by GET requests by default: introduced new keyword for function's `.rpc` property named "idempotent" that, when used with HTTP plugins, allows RPC over GET requests
