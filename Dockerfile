# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV HUSKY=0

# Use the repo's pinned npm (packageManager field) for every npm
# invocation in this stage, not the Node image's bundled npm.
RUN corepack enable npm

# The slim image ships no CA bundle, but the web build's PostHog plugin
# shells out to posthog-cli (a Rust binary that loads certificates from the
# system store) to resolve the release — without this it panics with
# "No CA certificates were loaded from the system".
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/web/package.json packages/web/
COPY packages/app/package.json packages/app/
COPY patches/ patches/

# @spudly/ui is served from GitHub Packages and needs an auth token. The
# token arrives as a BuildKit secret (flyctl --build-secret NODE_AUTH_TOKEN)
# and is mounted only for the npm ci step below, so it never lands in an
# image layer; this .npmrc holds just the ${NODE_AUTH_TOKEN} placeholder.
RUN printf '@spudly:registry=https://npm.pkg.github.com/\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n' > .npmrc

RUN --mount=type=secret,id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN npm ci --ignore-scripts \
  --workspace=@eciperay/web \
  --workspace=@eciperay/client \
  --workspace=@eciperay/types \
  --include-workspace-root

COPY packages/types packages/types
COPY packages/client packages/client
COPY packages/web packages/web
COPY assets assets
COPY scripts scripts
COPY tsconfig.base.json tsconfig.json ./

ARG VITE_API_BASE_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST
# Paddle client-side tokens are public browser identifiers, not secrets.
# The sandbox token + environment are the defaults so dev and preview
# builds always stay on the sandbox catalog; the production deploy
# (fly-deploy.yml) overrides both at cutover via --build-arg once the
# live token secret / environment variable are set — see
# docs/paddle-live-cutover.md.
ARG VITE_PADDLE_CLIENT_TOKEN=test_7cabfa52da84af66b23e645f693
ARG VITE_PADDLE_ENVIRONMENT=sandbox
ARG POSTHOG_API_KEY
ARG POSTHOG_PROJECT_ID
ARG POSTHOG_API_HOST
ARG GITHUB_SHA
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY}
ENV VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST}
ENV VITE_PADDLE_CLIENT_TOKEN=${VITE_PADDLE_CLIENT_TOKEN}
ENV VITE_PADDLE_ENVIRONMENT=${VITE_PADDLE_ENVIRONMENT}
ENV POSTHOG_API_KEY=${POSTHOG_API_KEY}
ENV POSTHOG_PROJECT_ID=${POSTHOG_PROJECT_ID}
ENV POSTHOG_API_HOST=${POSTHOG_API_HOST}
ENV GITHUB_SHA=${GITHUB_SHA}

RUN npm run build --workspace=packages/web

# Build the bundled SSR runtime entry (#304): the server's public-recipe
# renderer pulls in the @spudly/ui graph, which plain Node cannot load
# untranspiled, so it is bundled with the web substitutions into a single
# self-contained ESM file the runner stage loads directly (see
# packages/server/scripts/buildSsrBundle.mjs).
COPY packages/server packages/server
RUN npm run build:ssr --workspace=@eciperay/server

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
ENV HOST=0.0.0.0

# Use the repo's pinned npm (packageManager field) for the production
# install and the start command, not the Node image's bundled npm.
RUN corepack enable npm

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/web/package.json packages/web/
COPY packages/app/package.json packages/app/
COPY patches/ patches/

# The server's production closure now includes @spudly/ui (the #304 SSR
# renderer), which is served from GitHub Packages and needs an auth
# token — same BuildKit-secret pattern as the build stage above: the
# token is mounted only for this npm ci step and never lands in a layer.
RUN printf '@spudly:registry=https://npm.pkg.github.com/\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n' > .npmrc

RUN --mount=type=secret,id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN npm ci --omit=dev --ignore-scripts \
  --workspace=@eciperay/server \
  --workspace=@eciperay/client \
  --workspace=@eciperay/types \
  --include-workspace-root

COPY --from=build /app/packages/types packages/types
COPY packages/client packages/client
COPY packages/server packages/server
COPY --from=build /app/packages/server/dist-ssr packages/server/dist-ssr
COPY packages/mcp-server packages/mcp-server
COPY --from=build /app/packages/web/dist packages/web/dist

EXPOSE 8080
CMD ["npm", "run", "start", "--workspace=packages/server"]
