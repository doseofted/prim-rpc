# @doseofted/prim-rpc

## 0.1.0-alpha.12

### Patch Changes

- 8788b57: Fixed methods-on-methods that were in allowed list not being callable

## 0.1.0-alpha.11

### Minor Changes

- e8b8c64: Errors are now better handled during processing of HTTP-like requests/responses and processing of RPC
  calls/results

### Patch Changes

- 20164e9: Fix for broken type definitions (introduced in last version) on async functions used with client
- 8f0ff34: Only function types are given on module used with Prim RPC client, also available as new "RpcModule" type for
  usage outside of client or with JSDocs

## 0.1.0-alpha.10

### Patch Changes

- 33fdeb6: Fix for dynamic imports used with Prim RPC server
- b52fe0a: More in-depth checks added for calling module provided to Prim+RPC server

## 0.1.0-alpha.9

### Patch Changes

- fb51478: Reverted file size check behavior (types on server should reflect client more closely)

## 0.1.0-alpha.8

### Patch Changes

- 2bf318d: File/Blob size is now checked prior to sending RPC (discarded if size is 0)

## 0.1.0-alpha.7

### Patch Changes

- d0d9402: Bug fix: Batch time of 0 now makes RPC immediately instead of using timer with 0 seconds (fixes possibly
  sending batched request when not configured to do so)
- e007373: Bug fix: 400 HTTP status code no longer utilized when RPC result is a falsy value

## 0.1.0-alpha.6

### Minor Changes

- c15bde3: Module option of client and server now accepts dynamic imports and explicitly setting module value to null

## 0.1.0-alpha.5

### Patch Changes

- a139617: Upgraded project dependencies

## 0.1.0-alpha.4

### Minor Changes

- bbffc52: The default JSON parser is now unjs/destr

## 0.1.0-alpha.3

### Minor Changes

- d31b1a3: Replaced usage of Lodash with "just" utilities

## 0.1.0-alpha.2

### Patch Changes

- 551f2c0: Added provenance option to package.json

## 0.1.0-alpha.1

### Patch Changes

- 10f935c: Upgraded dependencies used in project

## 0.1.0-alpha.0

### Minor Changes

- Initial prerelease of Prim+RPC core, plugins, tooling
