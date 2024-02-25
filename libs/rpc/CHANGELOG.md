# @doseofted/prim-rpc

## 0.1.0-alpha.24

### Minor Changes

- 8072796: .methodsOnMethods option now requires an key/value object where the key is the method-on-method name and the value is either `true` or `"idempotent"` (similar to .allowList option)
- d5887ab: RPC can no longer be made by GET requests by default: introduced new keyword for function's `.rpc` property named "idempotent" that, when used with HTTP plugins, allows RPC over GET requests

## 0.1.0-alpha.23

### Patch Changes

- c7716bd: Added ability to receive multiple promises from a function with callback handler (disabled by default, must be enabled in options under `flags`)

## 0.1.0-alpha.22

### Patch Changes

- c2d2d3f: Updated dependencies to latest

## 0.1.0-alpha.21

### Patch Changes

- 5a61c07: Upgraded project dependencies

## 0.1.0-alpha.20

### Patch Changes

- 22d7cec: Improved type support on client for passing form events to a function (transformed by server)
- db47bc4: All type definitions for functions are transformed client-side because `this` argument is not needed on
  client

## 0.1.0-alpha.19

### Minor Changes

- c33e036: Client's module type parameter created with createPrimTestingSuite() is no longer wrapped in Partial type

### Patch Changes

- 24fdfdc: Function on client can now be passed as form's onsubmit handler directly

## 0.1.0-alpha.18

### Patch Changes

- 4b2ca8e: Added .preCall and .postCall hooks on server to transform args and results respectively

## 0.1.0-alpha.17

### Patch Changes

- bf3a720: RPC result can now contain binary data with default JSON handler
- f99c269: Binary JSON handler is now supported (.parse and .stringify can utilize binary data)

## 0.1.0-alpha.16

### Patch Changes

- ab6373f: Upgraded project lockfile

## 0.1.0-alpha.15

### Patch Changes

- d88195a: Upgraded dependencies
- d88195a: Adjusted type definitions to resolve internal type issue caught with upgraded TypeScript 5.1.6

## 0.1.0-alpha.14

### Patch Changes

- 382d472: Client module generic parameter must now match module option if provided
- 382d472: Allow list option is now typed according to module given on server
- 556b06f: Improved type support for allow list option of Prim+RPC

## 0.1.0-alpha.13

### Patch Changes

- 36cbb7d: Fix for "excessively deep" type error on Prim RPC client (methods-on-methods type now only shown if method is
  defined directly on function)

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
