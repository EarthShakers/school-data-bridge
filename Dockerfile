# --- 阶段 1: 依赖安装 ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
# ⚠️ 这里去掉 --frozen-lockfile 以确保容错性，或者确保本地 lockfile 已更新
RUN corepack enable pnpm && pnpm i --no-frozen-lockfile

# --- 阶段 2: 源码编译 ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 禁用 Next.js 遥测
ENV NEXT_TELEMETRY_DISABLED 1

# 构建项目
RUN corepack enable pnpm && pnpm run build

# --- 阶段 3: 运行阶段 ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ❗ 重要：为了让后台进程 (tsx src/index.ts) 正常工作，
# 运行环境必须具备完整的 node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 复制 Next.js 独立构建产物 (用于 Web Console)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制源码和必要目录 (用于 Worker/Scheduler)
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/mock ./mock
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs

EXPOSE 3000
ENV PORT 3000

# 根据 RUN_MODE 环境变量切换进程角色
CMD ["sh", "-c", "if [ \"$RUN_MODE\" = \"worker\" ]; then ./node_modules/.bin/tsx src/index.ts worker; elif [ \"$RUN_MODE\" = \"scheduler\" ]; then ./node_modules/.bin/tsx src/index.ts scheduler; else node server.js; fi"]
