---
"@doseofted/prim-rpc": patch
---

Bug fix: Batch time of 0 now makes RPC immediately instead of using timer with 0 seconds (fixes possibly sending batched
request when not configured to do so)
