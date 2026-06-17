# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/theme/package.json packages/theme/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
COPY packages/app/package.json packages/app/
COPY patches/ patches/

RUN npm ci --ignore-scripts \
  --workspace=@eciperay/web \
  --workspace=@eciperay/client \
  --workspace=@eciperay/types \
  --workspace=@eciperay/theme \
  --include-workspace-root

COPY packages/types packages/types
COPY packages/theme packages/theme
COPY packages/client packages/client
COPY packages/web packages/web
COPY tsconfig.base.json tsconfig.json ./

ARG VITE_API_BASE_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

RUN npm run build --workspace=packages/web

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/theme/package.json packages/theme/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
COPY packages/app/package.json packages/app/
COPY patches/ patches/

RUN npm ci --omit=dev --ignore-scripts \
  --workspace=@eciperay/server \
  --workspace=@eciperay/types \
  --include-workspace-root

COPY --from=build /app/packages/types packages/types
COPY --from=build /app/packages/server packages/server
COPY --from=build /app/packages/web/dist packages/web/dist

EXPOSE 8080
CMD ["npm", "run", "start", "--workspace=packages/server"]
