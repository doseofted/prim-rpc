# Prim (+ Proper)

Not a headless CMS but better. A place to structure and handle data. The administration interface is your app. This
project structure also serves as a reference for future projects (potentially to be broken off into a separate
boilerplate).

## The Idea

Keep it simple. Prim is a headless content manager. Creation of "ideas," blueprints for creating data structures, is
completed through the administration interface. Creation of "things," data instances generated to follow the structure
of a particular "idea," is done through an interface created by the developer through a provided headless library
("headless" as in the developer creates the interface, while functions are provided). Each "idea" can define the
structure for singular or multiple things and is made up of simple properties as well as other ideas, through
relationships of which can be as simple as 1-1 or 1-any (dynamic relationships with multiple types). Ideas can have
computed properties that come from other defined properties in other ideas, that can be cached, or they can have
generated properties that come from external data sources like a third party, that can't be cached as easily. They can
also have constants that don't change, for instance: variables that apply to every instance of data created for an
"idea." Properties of "things" and "things" themselves can have validations defined to make sure created data adheres to
the original "ideas."

Functions required for easy access to this data such as roles, permissions, translations, draft status, and annotations
should be created and managed by the application as "ideas" themselves (the system should be able to manage itself,
although there will always be exceptions).

All communication between server and client (whether administration interface or developer-created interface) is done
over HTTP and Websocket, with functions formatted loosely as JSON-RPC and response data sent back over JSON-RPC using
JSON-LD-like structures for linked data including paging. Structures for JSON could possibly be validated with
JSON-Schema standard for tasks such as defining requests and response shapes or even partially defining "things"
themselves. All data is assumed to be flat, that is, without hierarchy. Hierarchy may be defined by the developer
through linked structures but shouldn't be recognized in Prim for simplicity. Websocket connections are useful for
finding linked data structures since the connection is kept open once a "thing" is received through an RPC call. RPC
Calls can be optimized for linked data often so that it's readily available if requested or a parameter could be defined
to expand references only if absolutely needed (because this should be simple). A benefit of basing communication on
JSON is that it will be fairly easy to create type definitions that could be shared with a client.

## The Details

Prim will be made up of several low-level libraries to ensure ease-of-development and maintainability. This list will
likely grow as the projects grows but the following are currently planned:

- [Prim RPC](./libraries/packages/prim/README.md): a recursive Proxy that translates function calls made on the client
  into an RPC understood on the server.
  - Prim Server: Prim RPC is not intended to be a server in itself. Support may be added for Express/Connect, Fastify,
    and some WebSocket server frameworks. By default, it may integrate with H3 and WS frameworks if separate servers are
    not used.
  - Prim Client Helpers: Prim RPC will use browser's Fetch/WebSocket by default. Helpers can be added easily but some
    prebuilt-helpers may be created for common libraries, like Axios.
- Prim Data: A library built on top of an ORM (planning to use MikroORM) provided to the client over Prim RPC. Framework
  should allow CRUD abilities not just on "things" (as described above in [The Idea](#the-idea)) but also of "ideas."
- Prim Admin: An administration interface that interacts with Prim Data. It allows creation of new "ideas" and very
  basic management of "things" including the ability to generate "fake" data for use in development.
- Prim UI: A library that integrates with Vue (and potentially other interface frameworks) and allows easy interaction
  with Prim Data. Results returned from Prim are made reactive so that if a change is made and permission is available,
  results are synced back to Prim Data.

## Project Setup

This is a project is intended to be flexible but selects a few tools to make development easier. It is a monorepo
composed of:

- **Libraries and UI**: A set of shared libraries written in TypeScript and built with Parcel that, for the most part,
  can be used in both the Frontend and Backend. Most project logic should be contained in libraries and utilized by the
  frontend and backend, described next.
- **Backend**: Fastify server written in TypeScript built with Parcel that runs behind Caddy, a reverse proxy server.
- **Frontend**: A Vue app written in TypeScript built with Vite. Capacitor is used to serve native platforms.

All of these services are set up and configured through Docker Compose to easily set up the project so that all parts
can be developed locally. In development, source folders are watched so services are rebuilt in the running containers,
including libraries that frontend and backend depend on.

The goal is to synchronize steps taken to run a project in all environments (for example: dev, staging, prod), simplify
development of all parts of the project by completing prerequisite steps in containers that are configured to work
together with working versions of dependencies, and allow easy cross-platform development of the project by minimizing
the amount of steps required to setup the project itself.

## Development

In development, most project setup will be completed through use of containers configured with Docker Compose. Some
other dependencies are needed for a better development experience.

Follow steps below to setup a development environment. `nvm`, `task`, `mkcert`, `docker`, and `docker compose` are
suggested.

1. Install [nvm](https://github.com/nvm-sh/nvm) and run `nvm use` in this project to set the utilized Node version (or
   download given version in `.nvmrc`).
2. Run `corepack enable` so package managers defined in `package.json` files are utilized (`pnpm`). Otherwise, install
   version of `pnpm` given in `package.json`.
3. Install [Task](https://github.com/go-task/task) to easily run project tasks and dependencies. Alternatively, manually
   run commands defined in `Taskfile.yml`
4. Run `task js:setup` to install dependencies and build out all projects once so code editor can suggest type
   definitions in all projects.
5. Install [mkcert](https://github.com/FiloSottile/mkcert) for locally generated and trusted certifcates in web
   browsers. Run `mkcert -install` to install the certificate authority.
6. Although not required, this project is configured to be edited with VS Code. Install VS Code and open
   `prim.code-workspace` in the editor.
7. Once code-workspace is opened, a prompt will show recommended extensions for this project. Install all to utilize all
   settings of project.

## Production

In production, Docker and Docker Compose are the only tools needed to run the project.
[Task](https://github.com/go-task/task) (the task runner) will also be helpful.

## Get Going

Once steps for environment are completed, the project can be ran. Instructions given will be intended for Linux but
should generally work on Mac or through WSL2 on Windows.

In **development**:

```bash
# Set up environment for project (remember to edit the defaults before running)
cp .env.example .env
# Install dependencies and build all projects once, useful for type suggestions with editor
task js:setup
# Run dependencies given in Taskfile, start all services, then view logs (Ctrl-C will not shut it down)
task dc:dev
# When done, shut it all down
task dc:down
# Runs tests on libraries (changes made to libraries from Docker are synced back to host)
task js:test
# Once ready, build production version of services and push to registry
task dc:push
```

In **production** (assuming changes have already been pulled from git):

```bash
# Set up environment for project (remember to edit the defaults before running)
cp .env.example .env
# Pull changes to services (git changes should aready be pulled!)
task dc:pull
# Run dependencies given in Taskfile, start all services, then view logs (Ctrl-C will not shut it down)
task dc:up
```

For help with all other Task-related commands, run `task`. Tasks ran on the host in a Node environment are generally
prefixed with `js:` while Docker Compose commands are generally prefixed with `dc:`

For Node-specific tasks in projects, also see projects' respective `package.json` scripts. For instance, to run the dev
server in the frontend, use `pnpm frontend dev`. To run the dev server on the backend, use `pnpm backend dev`.
