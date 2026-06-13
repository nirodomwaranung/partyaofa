# Party AOFA — Web (Nuxt 4 SSR) production image.
# Build context = repo root:  docker build -f apps/web/Dockerfile .
# NUXT_PUBLIC_* are read at runtime by the Nitro node server, so the same
# image works across environments without a rebuild.

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
# Drop the macOS-generated lockfile so npm resolves linux-x64 native binaries
# (oxc-parser, esbuild, @parcel/watcher) fresh for this platform.
RUN rm -f package-lock.json && npm install --no-audit --no-fund

COPY apps/web apps/web
RUN npm run build --workspace apps/web

# ---- runtime stage ----
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
COPY --from=build /app/apps/web/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
