# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/icons/package.json packages/icons/
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
  --workspace=@eciperay/icons \
  --include-workspace-root

COPY packages/types packages/types
COPY packages/icons packages/icons
COPY packages/client packages/client
COPY packages/web packages/web
COPY scripts scripts
COPY assets assets
COPY tsconfig.base.json tsconfig.json ./

ARG VITE_API_BASE_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST
ARG POSTHOG_API_KEY
ARG POSTHOG_PROJECT_ID
ARG POSTHOG_API_HOST
ARG GITHUB_SHA
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY}
ENV VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST}
ENV POSTHOG_API_KEY=${POSTHOG_API_KEY}
ENV POSTHOG_PROJECT_ID=${POSTHOG_PROJECT_ID}
ENV POSTHOG_API_HOST=${POSTHOG_API_HOST}
ENV GITHUB_SHA=${GITHUB_SHA}

RUN npm run build --workspace=packages/web

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/icons/package.json packages/icons/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/web/package.json packages/web/
COPY packages/app/package.json packages/app/
COPY patches/ patches/

RUN npm ci --omit=dev --ignore-scripts \
  --workspace=@eciperay/server \
  --workspace=@eciperay/client \
  --workspace=@eciperay/types \
  --include-workspace-root

COPY --from=build /app/packages/types packages/types
COPY packages/client packages/client
COPY packages/server packages/server
COPY packages/mcp-server packages/mcp-server
COPY --from=build /app/packages/web/dist packages/web/dist

EXPOSE 8080
CMD ["npm", "run", "start", "--workspace=packages/server"]
