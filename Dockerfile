# --- 阶段 1: 依赖安装 ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
# 安装 pnpm 并安装所有依赖（包括 devDependencies 用于构建）
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# --- 阶段 2: 源码编译 ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 禁用 Next.js 遥测
ENV NEXT_TELEMETRY_DISABLED 1

# 构建项目
# Standalone 模式会根据 next.config.mjs 中的 output: 'standalone' 自动生成
RUN corepack enable pnpm && pnpm run build

# --- 阶段 3: 运行阶段 ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制静态资源和公开文件
COPY --from=builder /app/public ./public

# 设置缓存目录权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 复制独立构建产物
# .next/standalone 包含了运行 server.js 所需的最简依赖
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ❗ 注意：由于 Worker/Scheduler 需要运行 src 目录下的代码，
# 我们需要额外将 src 目录以及必要的 tsx 环境带入镜像。
# Standalone 模式默认不包含非 Next.js 的入口文件。
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

USER nextjs

EXPOSE 3000
ENV PORT 3000

# 根据 RUN_MODE 环境变量判断启动模式
# manual (默认) -> Web Console
# worker        -> 任务消费者
# scheduler     -> 任务调度器
CMD ["sh", "-c", "if [ \"$RUN_MODE\" = \"worker\" ]; then node node_modules/tsx/dist/cli.mjs src/index.ts worker; elif [ \"$RUN_MODE\" = \"scheduler\" ]; then node node_modules/tsx/dist/cli.mjs src/index.ts scheduler; else node server.js; fi"]
