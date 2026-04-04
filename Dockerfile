# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
RUN cd /temp/prod && bun install --production --frozen-lockfile

# Build the application
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build the TanStack Start app
ENV NODE_ENV=production
RUN bun run build

# Production image
FROM oven/bun:1-slim AS release
WORKDIR /usr/src/app

# Copy production node_modules (needed for drizzle-orm in migrations)
COPY --from=install /temp/prod/node_modules node_modules

# Copy the build output
COPY --from=prerelease /usr/src/app/.output .output
COPY --from=prerelease /usr/src/app/package.json .

# Copy drizzle SQL migration files
COPY --from=prerelease /usr/src/app/drizzle drizzle

# Copy database scripts and schema (needed for migrations and seed-admin)
COPY --from=prerelease /usr/src/app/src/db src/db

# Copy public directory for static assets (icons, manifest, etc.)
COPY --from=prerelease /usr/src/app/public ./public

# Copy entrypoint script
COPY --from=prerelease /usr/src/app/entrypoint.sh entrypoint.sh

# Create directory for persistent data with proper permissions
RUN mkdir -p /usr/src/app/data/uploads && chown -R bun:bun /usr/src/app

# Environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/usr/src/app/data

# Run as non-root user
USER bun

# Expose port (temps injects PORT env var)
EXPOSE 3000/tcp

CMD ["./entrypoint.sh"]
