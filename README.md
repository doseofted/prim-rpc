# Prim

Not a headless CMS but better. A place to structure and handle data. The administration interface is your app. This project structure also serves as a reference for future projects (potentially to be broken off into a separate boilerplate).

## The Idea

Keep it simple. Prim is a headless content manager. Creation of "ideas," blueprints for creating data structures, is completed through the administration interface. Creation of "things," data instances generated to follow the structure of a particular "idea," is done through an interface created by the developer through a provided headless library ("headless" as in the developer creates the interface, while functions are provided). Each "idea" can define the structure for singular or multiple things and is made up of simple properties as well as other ideas, through relationships of which can be as simple as 1-1 or 1-any (dynamic relationships with multiple types). Ideas can have computed properties that come from other defined properties in other ideas, that can be cached, or they can have generated properties that come from external data sources like a third party, that can't be cached as easily. They can also have constants that don't change, for instance: variables that apply to every instance of data created for an "idea." Properties of "things" and "things" themselves can have validations defined to make sure created data adheres to the original "ideas."

Functions required for easy access to this data such as roles, permissions, translations, draft status, and annotations should be created and managed by the application as "ideas" themselves (the system should be able to manage itself, although there will always be exceptions).

All communication between server and client (whether administation interface or developer-created interface) is done over HTTP and Websocket, with functions formatted loosely as JSON-RPC and response data sent back over JSON-RPC using JSON-LD-like structures for linked data including paging. Structures for JSON could possibly be validated with JSON-Schema standard for tasks such as defining requests and response shapes or even partially defining "things" themselves. All data is assumed to be flat, that is, without hierarchy. Hierarchy may be defined by the developer through linked structures but shouldn't be recognized in Prim for simplicity. Websocket connections are useful for finding linked data structures since the connection is kept open once a "thing" is received through an RPC call. RPC Calls can be optimized for linked data often so that it's readily available if requested or a parameter could be defined to expand references only if absolutely needed (because this should be simple). A benefit of basing communication on JSON is that it will be fairly easy to create type definitions that could be shared with a client.


## Project Setup

This is a project is intended to be flexible but selects a few tools to make development easier. It is a monorepo composed of:

- **Libraries**: A set of shared libraries written in TypeScript and built with Parcel that, for the most part, can be used in both the Frontend and Backend. Most project logic should be contained in libraries and utilized by the frontend and backend, described next.
- **Frontend**: Fastify server written in TypeScript built with Parcel that runs behind Caddy, a reverse proxy server.
- **Backend**: A Vue app written in TypeScript built with Vite. Capacitor is used to serve native platforms.

All of these services are set up and configured through Docker Compose to easily set up the project so that all parts can be developed locally. In development, source folders are watched so services are rebuilt in the running containers, including libraries that frontend and backend depend on. In production, the same configuration can be used to run the project with Docker Swarm.

The goal is to synchronize steps taken to run a project in all environments (for example: dev, staging, prod), simplify development of all parts of the project by completing prerequisite steps in containers that are configured to work together with working versions of dependencies, and allow easy cross-platform development of the project by minimizing the amount of steps required to setup the project itself.

## Development

In development, most project setup will be completed through use of containers configured with Docker Compose. Some other dependencies are needed for a better development experience.

Follow steps below to setup a development environment. Reference setup stage of `libraries/Dockerfile` for versions of dependencies used in this project.

1. Install [nvm](https://github.com/nvm-sh/nvm) and run `nvm use` in this project to set the utilized Node version.
2. Run `corepack enable` so package managers defined in `package.json` files are utilized.
3. Run `pnpm install` so type definitions can be suggested in code editor.
4. Install [Task](https://github.com/go-task/task) to easily run project tasks and dependencies.
5. Install [mkcert](https://github.com/FiloSottile/mkcert) for locally generated and trusted certifcates in web browsers. Run `mkcert -install` to install the certificate authority.
6. Although not required, this project is configured to be edited with VS Code. Install VS Code and open `prim.code-workspace` in the editor.
7. Once code-workspace is opened, a prompt will show recommended extensions for this project. Install all to utilize all settings of project.

## Production

In production, Docker and Docker Compose are the only tools needed to run the project. [Task](https://github.com/go-task/task) (the task runner) will also be helpful.

## Get Going

Instructions given will be intended for Linux but should generally work on Mac or through WSL2 on Windows.

```bash
# Set up environment for project (remember to edit the defaults before running)
cp .env.example .env
# Run dependencies given in Taskfile, start all services, then view logs (Ctrl-C will not shut it down)
task dc:up
# When done, shut it all down
task dc:down
# Development: Install dependencies and build type definitions for libraries, useful for type suggestions with editor
task js:setup
```

All other Task-related commands can be found by running `task --list`.

For Node-specific tasks in projects, also see projects' respective `package.json` scripts. For instance, to run the dev server in the frontend, use `pnpm frontend dev`. To run the dev server on the backend, use `pnpm backend dev`.
