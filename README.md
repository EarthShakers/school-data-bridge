# 学校数据导入服务

## 数据流转

学校数据导入和数据清洗转换使用 Node service 完成，然后调用 Java 服务写入数据库

## 技术架构

```text
┌───────────────────────────────────────────────────────────────────┐
│ 多数据源接入层（统一入口，兼容 3 种场景）                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │   主动拉取   │ │   被动接收   │ │  直连数据库  │             │
│ │（调对方 API）│ │（对方调我方）│ │ （直连 DB）  │             │
│ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌───────────────────────────────────────────────────────────────────┐
│ 数据源适配器层（核心：统一接口，标准化输出）                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │  API 适配器  │ │WebHook 适配器│ │   DB 适配器  │             │
│ │   （axios）  │ │（Express/Koa）│ │（ORM/原生 SQL）│             │
│ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│        └─────────────────┼────────────────┘                   │
│          │（统一格式：{ traceId, tenantId, rawData }）│             │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             任务调度层（BullMQ 生产者 / 事件驱动）                      │
│      （支持：手动触发 / 定时任务 / 失败任务重试 / 优先级队列）          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ [Job Enqueue]
┌───────────────────────────────▼─────────────────────────────────────────┐
│                任务持久化队列层（暂存 Redis）                           │
│     （解决：状态持久化 / 任务限流 / 并发锁 / 延迟任务处理）             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ [Job Dequeue]
┌───────────────────────────────▼─────────────────────────────────────────┐
│             配置引擎与数据暂存层（Context & Staging）                   │
│ （功能：读取学校个性化字段映射 / 原始数据快照存入 SQLite 或 Redis）    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                数据清洗转换层（核心：Pipeline 模式）                    │
│ ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    │
│ │   1. 字典映射    │──▶ │ 2. Zod 严格校验  │──▶ │ 3. 业务逻辑自检  │    │
│ └──────────────────┘    └──────────────────┘    └──────────────────┘    │
│ 处理：异构字段转换 node-json-transform、脏数据标记、数据标准化、唯一性预校验 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ [Batch / Stream]
┌───────────────────────────────▼─────────────────────────────────────────┐
│                高可靠写入层（Java 服务调用器）                         │
│ ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    │
│ │   p-limit 控流   │──▶ │   幂等写入 API   │──▶ │  背压/重试策略   │    │
│ └──────────────────┘    └──────────────────┘    └──────────────────┘    │
│ （方案：分批写入、Axios-Retry 指数退避、根据 Java 负载动态降频）      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                结果反馈与审计层（闭环体系）                            │
│ ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    │
│ │  更新任务状态表  │    │ 导出失败报告(XL) │    │   异常实时告警   │    │
│ └──────────────────┘    └──────────────────┘    └──────────────────┘    │
│ （全链路 TraceId 追踪，记录：成功数、失败原因、跳过记录、执行耗时）  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 前置要求

- **Node.js**: v18+
- **Redis**: 必须运行（用于 BullMQ 任务队列）
- **Java 服务**: 确保写入接口可用（或使用 Mock 模式）

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

在根目录创建 `.env`（可选），或通过环境变量注入：

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
# JAVA_USER_SERVICE_BASE_URL=http://your-java-api
```

### 4. 核心环境变量

| 变量名         | 默认值      | 可选值                                      | 说明                                         |
| :------------- | :---------- | :------------------------------------------ | :------------------------------------------- |
| **RUN_MODE**   | `manual`    | `manual`, `worker`, `scheduler`, `producer` | **核心运行模式开关**（见下文“运行模式”详情） |
| **REDIS_HOST** | `localhost` | -                                           | Redis 服务器地址                             |
| **REDIS_PORT** | `6379`      | -                                           | Redis 端口                                   |
| **LOG_LEVEL**  | `info`      | `debug`, `info`, `warn`, `error`            | 日志级别                                     |

---

## 🛠 运行模式（进程角色）

在分布式架构中，系统被划分为不同的角色。**要实现完整的自动化同步，Worker、Scheduler 和 Web 平台必须配合运行。**

### 1. 角色关系图

```text
[ Web UI ] <──( API )──> [ Next.js API ] ──( 触发 )──┐
                                                     ▼
[ Scheduler ] ──( 注册/触发任务 )──▶ [ Redis 队列 ] ◀──( 监听/执行任务 )── [ Worker ]
      ▲                                                                    │
      └──────────( 读取配置 )────────── [ JSON5 Config ] ──────────( 执行逻辑 )─┘
```

### 2. 角色详情

#### 🔹 后台管理平台 (Web UI) —— **新增加**

基于 Next.js + Ant Design 构建的可视化管理后台。

- **启动：** `npm run dev` (开发模式)
- **地址：** `http://localhost:3000`
- **功能：** 可视化监控任务队列、手动触发租户同步、查看导入状态。

#### 🔹 后台处理进程 (Worker) —— **核心，必须运行**

它是真正执行同步逻辑的“苦力”。没有它，任何排队的任务都不会被执行。

- **启动：** `npm run worker`
- **建议：** 生产环境可启动多个实例以实现并行处理。

#### 🔹 定时调度进程 (Scheduler) —— **大脑，按需运行**

它负责根据配置文件中的 `cron` 表达式，定时向队列派发任务。

- **启动：** `npm run scheduler`
- **说明：** 任务注册进 Redis 后，只要 Redis 不停，调度信息就会保留。

#### 🔹 手动推送进程 (Producer) —— **临时工**

当你不想等定时时间，想立刻触发一次同步时使用。它会将任务推入队列，然后退出。

- **启动：** `npm run produce tenant001 all`

#### 🔹 立即执行模式 (Immediate) —— **调试工具**

不经过 Redis 队列，直接在当前进程同步。适合本地快速验证字段转换是否正确。

- **启动：** `npm start tenant001 student_db`

---

### 💡 建议启动方式 (本地开发)

如果你想在本地一次性启动所有必要角色，可以打开两个终端窗口：

1. **窗口 1 (干活的):** `npm run worker`
2. **窗口 2 (看状态/派活的):** `npm run dev` (Web 平台)

---

## 🐳 Docker 部署 (生产环境)

系统已针对生产环境进行了 Docker 优化，支持 Next.js Standalone 模式。

### 1. 启动服务

在根目录下执行：

```bash
docker-compose up -d --build
```

这会启动 4 个容器：

- `bridge-redis`: 任务队列存储
- `bridge-web`: 管理后台 (Port 3000)
- `bridge-worker`: 任务处理器
- `bridge-scheduler`: 任务调度器

### 2. 环境变量

在 `docker-compose.yml` 中，可以通过 `RUN_MODE` 切换容器角色：

- `manual`: Web 控制台模式
- `worker`: Worker 模式
- `scheduler`: Scheduler 模式

同时需要配置 `METADATA_DB_URL` 指向你的 MySQL 元数据库。

### 3. 初始化数据库

第一次部署时，需运行迁移脚本：

```bash
docker exec -it bridge-web npx tsx scripts/migrateToDb.ts
```

---

## 📂 文件系统

```text

src/
├── domain/ # [领域层] 核心业务定义
│ └── schemas/ # 👈 独立目录：按实体拆分校验规则
│ ├── teacher.ts
│ ├── student.ts
│ ├── organization.ts
│ └── index.ts # 统一导出入口
├── config/ # [配置逻辑层] 👈 从 core 移出
│ └── configEngine.ts # 专门负责配置的 Provider (未来可无缝切换为从数据库读取)
├── core/ # [引擎层]
│ └── pipeline.ts # 纯粹的数据转换引擎逻辑
├── adapters/ # [基础设施-接入]
├── services/ # [基础设施-写入]
└── index.ts # [应用入口]
```

## 核心工具解读

### 1. BullMQ

BullMQ 是基于 Redis 构建的 Node.js 专用分布式任务队列/调度工具，核心用于管理异步、耗时、分布式任务

- 基于 Redis 作为存储层，读写性能优异，支持海量任务存储
- 支持任务分片、多消费者并发处理，能轻松应对高并发任务场景
- 具备任务超时检测、死信队列（失败多次的任务单独归档）功能，保证任务流转的完整性。
- 提供可视化监控工具（Bull Board），可直观查看队列状态、任务执行情况、失败任务详情。

### 2. SQLite/Redis

- 承担暂存数据 + 分布式协同 + 高性能任务调度支撑
- 读取原始数据后先落库暂存，标记为 pending，清洗完标记为 cleaned，Java 写入成功后标记为 synced。
- 支持断点续传，且方便在 Java 写入失败时进行重试，而无需重新请求 API。

### 3. 客户个性化字段映射

```
// tenant001.json5
{
  tenantId: "tenant001",
  schoolName: "XX中学",
  dataSource: {
    type: "excel",
    config: {
      filePath: "./data/tenant001_users.xlsx",
      sheetName: "用户列表",
      startRow: 2 // 跳过表头行
    }
  },
  // 字段映射规则（供 node-json-transform 使用）
  fieldMap: [
    {
      sourceField: "XM", // 客户字段：姓名
      targetField: "name", // Java服务字段
      converter: "default",
      required: true
    },
    {
      sourceField: "XB", // 客户字段：性别（1=男，0=女）
      targetField: "gender",
      converter: "genderConverter",
      converterConfig: { 1: "male", 0: "female" }
    }
  ],
  batchConfig: {
    batchSize: 100,
    retryTimes: 3
  }
}
```

### 4. node-json-transform / jsonata

根据字段映射生成符合我们数据模型的 json

```
const JsonTransform = require('node-json-transform').JsonTransform;
const { getSchoolConfig } = require('./configEngine'); // 读取 JSON5 配置

// 转换函数库（与 JSON5 配置中的 converter 对应）
const converters = {
  default: (value) => value,
  genderConverter: (value, config) => config[value] || 'unknown'
};

// 执行数据转换
async function transformRawData(tenantId, rawData) {
  // 1. 从 JSON5 配置中读取字段映射规则
  const schoolConfig = await getSchoolConfig(tenantId);
  const { fieldMap } = schoolConfig;

  // 2. 构造 node-json-transform 配置
  const transformMap = {
    map: fieldMap.map(item => ({
      key: item.targetField, // 目标字段
      value: item.sourceField, // 源字段
      // 自定义转换函数
      transform: (value) => {
        const converter = converters[item.converter];
        return converter(value, item.converterConfig || {});
      }
    })),
    // 可选：过滤无效数据
    filter: (item) => {
      return fieldMap.every(map => !map.required || !!item[map.sourceField]);
    }
  };

  // 3. 执行转换
  const transformer = JsonTransform(transformMap);
  const transformedData = transformer.transform(rawData);

  return transformedData;
}
```

### 5. 类型校验 Zod

把住「数据质量关」，提前过滤格式非法、缺失关键信息的脏数据，避免无效数据流入下游 Java 服务，减少接口调用失败和数据异常。

### 6. ETag/MD5（非必须）

对比上次抓取的数据，如果数据没变则跳过，减少无效数据处理

### 7. 数据写入

调用 Java 接口分批写入、Axios-Retry 指数退避、根据 Java 负载动态降频

### 8. Java 服务的核心支持要求

1. 针对「幂等写入 API」：Java 服务必须实现幂等性支持（核心要求）这是保障数据不重复的关键

2. 针对「p-limit 控流 + 分批写入」：Java 服务需支持批量写入接口,明确批量接口的单次接收数据上限;支持接口限流提示（如返回 429 Too Many Requests 状态码），便于 Node.js 端感知 Java 服务负载

3. 针对「背压 / 重试策略」：Java 服务需提供两类支撑接口 / 能力

   - 明确可重试的错误类型，并返回标准 HTTP 状态码；
   - 接口响应时间稳定，或明确超时时间;
   - 提供健康检查 / 负载监控接口(可选)
   - 支持优雅降级提示

### 9. 日志监控

1.  生成 TraceId：在任务创建（生产者入队）时，用 uuid/nanoid 生成全局唯一 TraceId；
2.  透传 TraceId：将 TraceId 贯穿所有环节（队列层 → 暂存层 → 转换层 → 写入层 → 审计层），作为日志打印、状态记录、报告生成的核心关联字段

### 10. 任务状态表字段设计

核心字段，可按需扩展：
| 字段名 | 字段类型 | 核心作用 |
|--------|----------|----------|
| trace_id | 字符串（主键） | 全链路唯一标识，关联所有环节 |
| tenant_id | 字符串 | 关联租户，实现多租户隔离 |
| task_id | 字符串 | 关联队列任务 ID，便于查询队列日志 |
| school_name | 字符串 | 业务标识，便于人工排查 |
| status | 字符串 | 任务核心状态（如 pending/running/success/failed/skipped）|
| stats | JSON 字符串 | 统计数据（成功数、失败数、跳过数、总数据量、执行耗时） |
| error_msg | 字符串 | 任务失败时的异常信息（如 Java 服务不可用） |
| create_time | 时间戳 | 任务创建时间 |
| update_time | 时间戳 | 任务状态更新时间 |
| finish_time | 时间戳 | 任务完成（成功 / 失败 / 跳过）时间 |

### 同步顺序

- 先组织架构 后同步人员
