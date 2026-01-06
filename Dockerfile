# --- 阶段 1: 构建阶段 ---
FROM node:20-slim AS builder
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件并安装
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 复制源码并构建 Next.js
COPY . .
RUN npm run build

# --- 阶段 2: 运行阶段 ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# 复制运行时需要的资源
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/config ./config
COPY --from=builder /app/tsconfig.json ./

# 安装 ts-node 以支持生产环境运行 .ts 文件（或者你可以选择编译 src）
RUN npm install -g ts-node typescript

# 暴露 Web 端口
EXPOSE 3000

# 默认启动 Web 模式，实际运行可通过 docker-compose override
CMD ["npm", "run", "web:start"]

