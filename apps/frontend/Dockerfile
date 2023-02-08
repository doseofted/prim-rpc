# NOTE: image included below must be built first before building this image
FROM doseofted/prim-monorepo-build:latest as dev

# Create directory where this portion of project will live
RUN mkdir -p apps/frontend && chown -R node apps
WORKDIR /home/node/project/apps/frontend
# Install dependencies (already fetched monorepo dependencies so this should be quick)
COPY --chown=node package.json .
RUN NODE_ENV="" pnpm install --offline --frozen-lockfile
# Build the project
COPY --chown=node . .
RUN NODE_ENV="" pnpm build
# Run the project. Entrypoint script will detect NODE_ENV
ENV NODE_ENV=development
CMD [ "pnpm", "zx", "entrypoint.mjs" ]

FROM dev as dev-cleanup
WORKDIR /home/node/project
# Clean up all development-related node modules before production install (a dependency of `task dev:clean`)
# RUN pnpm task dev:clean-node-modules

# NOTE: image included below must be built first before building this image
FROM doseofted/prim-monorepo-production:latest as prod
# Copy built files
COPY --chown=node --from=dev-cleanup /home/node/project/misc /home/node/project/misc
COPY --chown=node --from=dev-cleanup /home/node/project/libs /home/node/project/libs
COPY --chown=node --from=dev-cleanup /home/node/project/apps /home/node/project/apps
# Install only dependencies needed in production
WORKDIR /home/node/project
RUN NODE_ENV="" pnpm install --prod --offline --frozen-lockfile
# Run the project with production settings
WORKDIR /home/node/project/apps/frontend
ENV NODE_ENV=production
CMD [ "pnpm", "zx", "entrypoint.mjs" ]
