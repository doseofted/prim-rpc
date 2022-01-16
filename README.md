# Prim

Not a headless CMS but better. A place to structure and handle data. The administration interface is your app.

## Get Going

```bash
# Set alias and functions, useful for project
source source.sh
# Start apps, show all logs, and shut it all down on Ctrl-C
dc-magic
# Optional: start DNS server that can resolve ".test" TLD, if needed
testdns
```

## Idea

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

## Get Started

To start the project easily, use aliases: `source source.sh`. Reference the following commands for development. Commands starting with `dc` represent `docker-compose`. To access the project locally with a trusted certificate run alias `devcert` (uses mkcert, only intended fro development). Start the project with `dc-magic`.

If database has never been initialized before (there are zero migrations), run `dex api migrate --name init` to generate Prisma client (along with type definitions for TypeScript), create an inital migration file, and prepare the database. If database has been initalized but not on the current development device, run `dex api prisma migrate dev` to run migrations in development mode. Note that this all happens in Docker, not locally.

In order to use generated TypeScript definitions during local development, run `yarn generate` on machine (happens locally). The environment variable `DATABASE_URL` will need to be populated even though it doesn't appear a connection is made to the database with this command. The `DATABASE_URL` variable can be found in the Docker Compose config of this project. When using `source source.sh`, all required variables will already be set. I'll need to make this simpler in the future.

**Note:** local development of the API server is not possible unless all steps in Docker container are completed including setup if dependencies. This is because the server depends on the database and some values that are only set or otherwise available in the container. For simplicity's sake and since the server will be ran with Docker anaway, just use Docker during development (because things just work).

## Server-related Commands

Command | Description
--- | ---
`dc` | Run `docker-compose` with configuration needed for environment. Environment set in `.env`.
`dc-up` | Start project in background
`dc-down` | Stop running project, also remove anonymous volumes and containers no longer in use.
`dc-logs` | Tail latest logs from containers, Ctrl-C to stop tailing
`dex <container_name> <command>` | Run command in running container, for example `dex api yarn` will run execute `yarn` in `api` container.
`drun <container_name> <command>` | Run command in one-off container based on specified container's image. Without a given command, an interactive bash session will be started.

**Note:** The API container can interact with the database through Prisma. In development, migrations can be created by editing `schema.prisma` with changes and then running `dex api migrate --name [NAME]`. Once pushed to production, the entrypoint file will automatically call `yarn migrate deploy`.

## App-related Commands

Change folder to `./project/ui` to run the app in a desktop or mobile app. In order to build the project run 

```bash
# set host to be used in app
export VITE_HOST=prim.dose.host
# build the app with host and then sync that to Android and iOS
yarn build && yarn sync
# Run on platform needed (also available, `yarn android`)
yarn ios
```

Use the following commands specific to app development:

Command | Description
--- | ---
`yarn build` | Build application
`yarn dev` | Build application and watch for changes
`yarn sync` | Sync built application for all supported platforms
`yarn desktop|ios|android` | Run built project on platform

## Notes

- iOS and Android have support for live reload in development but feature is not supported for Electron yet ([follow issue here](https://github.com/capacitor-community/electron/issues/120))
- Yarn is aliased so that is can be used regardless of current working directory but some commands like those for Electron platform will require the working directory to be `./project/ui` when running command through Yarn.
- When developing with Docker, Yarn commands should be ran within container during development to prevent missing modules. Volumes mounted through Compose will allow changes made to `package.json` to be seen from host.
- On M1 Macs, Node 16 on Debian Buster is not currently working when emulating x86_64 architecture. However Node 16 seems to work on Bullseye release of Debian which is not yet available on Docker Hub for the Node image. Until it is, Node 14 is working and has few major changes from version 16 that will affect me. [Follow issue here](https://github.com/docker/for-mac/issues/5831).
