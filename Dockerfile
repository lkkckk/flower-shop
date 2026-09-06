FROM node:20-bookworm AS build

RUN npm install --global pnpm@10.33.0
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-bookworm AS runtime
RUN npm install --global pnpm@10.33.0

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.json()).then(v=>process.exit(v?.data?.status==='ok'?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm run db:seed && exec node .output/server/index.mjs"]
