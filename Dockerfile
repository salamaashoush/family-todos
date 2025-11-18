# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json /temp/dev/
RUN cd /temp/dev && bun install

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json /temp/prod/
RUN cd /temp/prod && bun install --production

# Build the application
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build the TanStack Start app
ENV NODE_ENV=production
RUN bun run build

# Copy production dependencies and build output into final image
FROM base AS release

# Copy production node_modules
COPY --from=install /temp/prod/node_modules node_modules

# Copy the build output
COPY --from=prerelease /usr/src/app/.output .output
COPY --from=prerelease /usr/src/app/package.json .

# Copy public directory (if it exists)
COPY --from=prerelease /usr/src/app/public ./public

# Create directory for database with proper permissions
RUN mkdir -p /usr/src/app/data && chown -R bun:bun /usr/src/app

# Run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", ".output/server/index.mjs" ]
