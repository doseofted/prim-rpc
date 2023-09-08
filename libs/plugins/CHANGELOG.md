# @doseofted/prim-rpc-plugins

## 0.1.0-alpha.15

### Patch Changes

- 2aad319: Next.js handler now supports files in RPC result
- 61b77b1: Hono handler now supports files contained in RPC result
- 79a7ee3: Express handler now supports files in RPC result, now using formidable as multipart plugin
- 3fbc99c: Astro handler now supports files in RPC result
- bf3a720: Fastify handler now supports sending back files as part of RPC result
- 36e16f7: H3 handler now supports files in RPC result
- bf3a720: Browser fetch plugin can now handle binary RPC result

## 0.1.0-alpha.14

### Patch Changes

- ab6373f: Upgraded project lockfile
- 780acf1: Added plugin to support Astro in SSR mode

## 0.1.0-alpha.13

### Patch Changes

- d88195a: Upgraded dependencies

## 0.1.0-alpha.12

### Patch Changes

- 556b06f: Web Worker plugin now supports Shared Workers

## 0.1.0-alpha.11

### Patch Changes

- fb51478: Relaxed Hono file checking to prevent binary prefix string being returned for empty file

## 0.1.0-alpha.10

### Minor Changes

- 20df825: Web Worker plugin now has new jsonHandler export (existing plugins now only return plugin without extra JSON
  handler)

## 0.1.0-alpha.9

### Patch Changes

- 78e736c: .headers is no longer a required parameter on the Next.js plugin

## 0.1.0-alpha.8

### Patch Changes

- eeee54f: Plugins now use dynamic import for Node-specific logic to support other runtimes

## 0.1.0-alpha.7

### Minor Changes

- 84184c2: Next.js now uses File object, no longer uses tmp directory
- ce950ec: H3 integration now uses File object, no longer saves file to tmp directory
- 9ad59c9: Fastify plugin now saves to File object, no longer saves to tmp directory
- 04a8ac0: Express integration now uses File object, no longer uses tmp directory

### Patch Changes

- 8716903: Next.js handler renamed defineNextjsAppHandler -> defineNextjsAppPrimHandler

## 0.1.0-alpha.6

### Patch Changes

- a139617: Upgraded project dependencies

## 0.1.0-alpha.5

### Patch Changes

- 14dfdc2: Fix for custom paths used with Hono method handler

## 0.1.0-alpha.4

### Minor Changes

- b017c42: Added method handler for Hono framework

## 0.1.0-alpha.3

### Patch Changes

- fe2704f: Added Next.js server handler (for App Router)

## 0.1.0-alpha.2

### Patch Changes

- 551f2c0: Added provenance option to package.json

## 0.1.0-alpha.1

### Patch Changes

- 10f935c: Upgraded dependencies used in project

## 0.1.0-alpha.0

### Minor Changes

- Initial prerelease of Prim+RPC core, plugins, tooling
