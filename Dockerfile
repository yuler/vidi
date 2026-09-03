FROM node:24-alpine AS build

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY . .
ENV CI=true
RUN pnpm install
RUN pnpm build

FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY --from=build /app/.output ./.output

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
