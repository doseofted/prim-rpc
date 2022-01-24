# Prim

Not a headless CMS but better. A place to structure and handle data. The administration interface is your app.

## Project Setup

This is a project is intended to be flexible but selects a few tools to make development easier. It is a monorepo composed of:

- **Libraries**: A set of shared libraries written in TypeScript and built with Parcel that, for the most part, can be used in both the Frontend and Backend. Most project logic should be contained in libraries and utilized by the frontend and backend, described next.
- **Frontend**: Fastify server written in TypeScript built with Parcel that runs behind Caddy, a reverse proxy server.
- **Backend**: A Vue app written in TypeScript built with Vite. Capacitor is used to serve native platforms.

All of these services are set up and configured through Docker Compose to easily set up the project so that all parts can be developed locally. In development, source folders are watched so services are rebuilt in the running containers, including libraries that frontend and backend depend on. In production, the same configuration can be used to run the project with Docker Swarm.

The goal is to synchronize steps taken to run a project in all environments (for example: dev, staging, prod), simplify development of all parts of the project by completing prerequisite steps in containers that are configured to work together with working versions of dependencies, and allow easy cross-platform development of the project by minimizing the amount of steps required to setup the project itself.

# Development

In development, most project setup will be completed through use of containers configured with Docker Compose. Some other dependencies are needed for a better development experience.

Follow steps below to setup a development environment. Reference setup stage of `libraries/Dockerfile` for versions of dependencies used in this project.

1. Install [nvm](https://github.com/nvm-sh/nvm) and run `nvm use` in this project to set the utilized Node version.
2. Run `corepack enable` so package managers defined in `package.json` files are utilized.
3. Run `pnpm install` so type definitions can be suggested in code edtior.
4. Install [mkcert](https://github.com/FiloSottile/mkcert) for locally generated and trusted certifcates in web browsers. Run `mkcert -install` to install the certificate authority.
5. Although not required, this project is configured to be edited with VS Code. Install VS Code and open `prim.code-workspace` in the editor.
6. Once code-workspace is opened, a prompt will show recommended extensions for this project. Install all to utilize all settings of project.

In production, Docker and Docker Compose are the only tools needed to run the project.

## Get Going

Instructions given will be intended for Linux but should generally work on Mac or through WSL2 on Windows.

```bash
# Set up environment for services (and remember to edit/configure for project run)
cp .env.example .env
# Set aliases and functions, useful for project
source source.sh
# Start server and show all service logs
dc-magic
# When done, shut it all down
dc-down
# Development: Install dependencies locally, useful for type suggestions with editor
pnpm install
# Development: start DNS server that can resolve ".test" TLD, if needed
testdns
```

### Container Commands

There are quite a few aliases set to accomplish tasks in the project. These make the project easy to manage. Below is a list ofthe most common and useful commands. To see what they all do, see `source.sh` in this project.

Command | Description
--- | ---
`dc` | Run `docker-compose` with configuration needed for environment. Environment set in `.env`. All commands prefixed with `dc-*` utilize this function to replace `docker-compose -f config.yml -f config.yml ... [CMD]` with something like `dc [CMD]`.
`dc-magic` | Setup all project dependencies and then start all project services. When done running in the foreground, just type `CTRL-C` and suggestions will be offered to interact with or shut down services.

### Native Commands

While development of the server is done through Docker Compose, containerization isn't so useful when you're building an app for a platform natively. This means that some commands will only work on some systems. iOS builds can only be built on a Mac. Desktop builds can only be built on each respective platform.

There are a lot of scripts scattered throughout `package.json` files. The command reference below are the most important and are intended be ran from the root of this project (it is a monorepo), where `prim` is a reference to `pnpm frontend` which just filters commands to only be ran from frontend package.

Command | Description
--- | ---
`prim sync` | Build application and then sync build to all platforms, including Electron. Some environment variables will need to be provided so build picks them up, for example: `VITE_HOST="prim.localhost" prim sync` 
`prim <platform>` | Run built project on given platform, currently: `ios`, `android`, and `desktop`.

## Prim Idea

### Draft 1

To get off on the right foot, here are some ideas to guide initial code:

- Prim should be designed to declare what makes data valid and how that data should behave. It's built on "Things" because data should point to some tangible thing, not just data and metadata.
- User system is built from a "Thing." Things are created by Users.
  - "Simple Things" are made up of one single property.
  - "Complex Things" are made from Simple things.
- Complex Things have relationships to other Things. It can be as simple as a 1-to-1 relationship to another Thing or a list of disparate other Things of an allowed list of Thing types.
- Validations exist on Simple things. For example a string pattern or minimum value of a number. For example, if a Simple Thing called "Date" is created, a validation of "must be within 20 years of today's date" could be added. Custom validations can be added as code or created from other Validations.
- Behaviors exist on Complex Things. Behaviors are like Validations in the way that they are simple and reusable functions. The difference is that Behaviors are given properties of a Complex Thing (as arguments) to either read or modify on the Thing. Validations are only given a single value and hard-coded arguments (such as minimum length of 1).
  - As an example, a user validation Behavior would be given arguments of username, password, lastLoggedIn (all Simple Things that make up Complex Thing). Username and password are read and, if successful, lastLoggedIn is modified.
- User system, translations (i18n), annotations, roles, and draft status are all just pre-created and extendable Complex Things, utilized by adding relationships, validations, and behaviors to a newly created Thing.
- Things need to be represented somehow so that they can be understood. Throwing random fields on a page to edit a Thing is confusing. Things should be represented by an Interface (an individual component).
  - There's no need for a separate administration app after initial types are created. The UI created for an application (using whatever UI framework) should also be used to represent created Things.
  - Each Thing should have a dedicated Interface.
  - Each Thing has an Interface. The Interface is where the Thing is both edited and viewed. A separate Interface should be used to house and create the Thing and its Interface
  - For a list of Complex Things, a housing Interface should be used to add new Things to the list.
  - As an example, an ordered list of things could be represented in the UI by dragging and dropping components from a list and modifying a Simple Thing named "order" on the Complex thing.
  - The final result is a website builder of sorts with a focus on the back-end with freedom to work on front-end however you'd like, guided by low-level interface code that Prim should provide. For instance, Prim should provide tools to easily interact with Thing's data and modify that data on UI events like editing a text field or dragging/dropping.
- Prim itself may have an initial builder for creating Things with their various validations, behaviors, and relationships. This will work like a node graph where app can be designed visually and structure JSON to declaratively describe Things. The created JSON should be so simple that someone could write it by hand (although you shouldn't have to).
  - Once created, there may be an interface for viewing things as a list or table of readable properties. However, an Interface should be created to view individual Things in detail (otherwise I'm back to viewing a seemingly-random list of fields that vaguely describe a Thing).
  - "Representations" may be added to Simple and Complex Things to describe them and its basic readable properties. For instance, a user might be represented by template "{profilePicture(img)} {name} ({email})". A Simple Thing would be represented by a function, for instance to translate a created "date" type to something in users' language.
- There's no such thing as an original Idea. Ideas come from Things around us. In Prim, an "Idea" is computed from Things and doesn't exist except from those things. It's similar to computed properties in Vue. They may be stored and updated in a database for easier searching and querying but they are directly attached to properties of Things
- Prim doesn't reinvent the wheel, it makes the wheel useful by building a car. Cars have been built before but but I didn't like them so I'm making my own. Don't reinvent validation, data-handling, and querying libaries. The only thing being invented is the Prim app, as described above.

### Draft 2

Keep it simple. Prim is a headless content manager. Creation of "ideas," blueprints for creating data structures, is completed through the administration interface. Creation of "things," data instances generated to follow the structure of a particular "idea," is done through an interface created by the developer through a provided headless library ("headless" as in the developer creates the interface, while functions are provided). Each "idea" can define the structure for singular or multiple things and is made up of simple properties as well as other ideas. Ideas can have generated properties that come from other defined properties or ideas and can also have constants that don't change. Properties of "things" and "things" themselves can have validations defined to make sure created data adheres to the original "ideas."

All communication between server and client (whether administation interface or developer-created interface) is done over HTTP and Websocket, with functions formatted loosely as JSON-RPC and response data sent back over JSON-RPC using JSON-LD-like structures for linked data. Structures for JSON could possibly be validated with JSON-Schema standard for tasks such as defining requests and response shapes or even partially defining "things" themselves. All data is assumed to be flat, that is, without hierarchy. Hierarchy may be defined by the developer through linked structures but shouldn't be recognized in Prim for simplicty. Websocket connections are useful for finding linked data structures since the connection is kept open once a "thing" is received through an RPC call. RPC Calls can be optimized for linked data often so that it's readily available if requested or a paramteer could be defined to expand references only if absolutely needed (because this should be simple). A benefit of basing communication on JSON is that it will be fairly easy to create type definitions that could be shared with a client.
