# NOTE: image below must be built first before building this image
FROM doseofted/monorepo-build:latest as dev

# Create directory where this portion of project will live
RUN mkdir -p apps/backend && chown -R node apps
WORKDIR /home/node/project/apps/backend
# Install dependencies (already fetched monorepo dependencies so this should be quick)
COPY --chown=node package.json .
RUN pnpm install --offline --frozen-lockfile
# Build the project
COPY --chown=node . .
RUN pnpm build

ENV NODE_ENV=development
CMD [ "pnpm", "zx", "entrypoint.mjs" ]

# TODO: add a production stage for running in production
