import "dotenv/config";
import fs from "fs";
import path from "path";
import JSON5 from "json5";
import knex from "knex";

// 初始化数据库连接
const db = knex({
  client: "mysql2",
  connection:
    process.env.METADATA_DB_URL ||
    "mysql://root:hyt123456@120.46.13.170:3306/school_data_bridge",
});

const CONFIG_BASE_PATH = path.join(process.cwd(), "config");

/**
 * 自动创建表结构
 */
async function initSchema() {
  console.log("🛠 Checking database tables...");

  // 1. 系统环境配置表
  if (!(await db.schema.hasTable("bridge_system_environments"))) {
    await db.schema.createTable("bridge_system_environments", (table) => {
      table.string("id", 50).primary().comment("环境ID (dev/test/prod)");
      table.string("name", 100).notNullable().comment("环境名称");
      table.string("url", 255).notNullable().comment("Java接口Base URL");
      table.timestamp("updated_at").defaultTo(db.fn.now());
    });
    console.log("✅ Table 'bridge_system_environments' created.");
  }

  // 2. 租户基础配置表
  if (!(await db.schema.hasTable("bridge_tenants"))) {
    await db.schema.createTable("bridge_tenants", (table) => {
      table.string("tenant_id", 100).primary().comment("租户ID");
      table.string("school_name", 255).comment("学校名称");
      table.string("status", 20).defaultTo("active").comment("状态");
      table.json("common_config").comment("共享配置(JSON)");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
    });
    console.log("✅ Table 'bridge_tenants' created.");
  }

  // 3. 实体同步规则配置表
  if (!(await db.schema.hasTable("bridge_entity_configs"))) {
    await db.schema.createTable("bridge_entity_configs", (table) => {
      table.increments("id").primary();
      table.string("tenant_id", 100).notNullable().comment("租户ID");
      table.string("entity_type", 50).notNullable().comment("实体类型");
      table.json("data_source").notNullable().comment("数据源配置(JSON)");
      table.json("field_map").notNullable().comment("字段映射(JSON)");
      table.json("batch_config").comment("批次配置(JSON)");
      table.json("sync_config").comment("同步计划配置(JSON)");
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.unique(["tenant_id", "entity_type"], {
        indexName: "idx_tenant_entity",
      });
    });
    console.log("✅ Table 'bridge_entity_configs' created.");
  }

  // 4. 同步日志记录表
  if (!(await db.schema.hasTable("bridge_sync_logs"))) {
    await db.schema.createTable("bridge_sync_logs", (table) => {
      table.increments("id").primary();
      table.string("tenant_id", 100).notNullable().index().comment("租户ID");
      table.string("entity_type", 50).notNullable().index().comment("实体类型");
      table.string("trace_id", 100).notNullable().comment("跟踪ID");
      table.json("summary").notNullable().comment("统计摘要(total/success/failed)");
      table.json("stages").comment("全流程阶段指标(fetch/transform/write)");
      table.specificType("success_data", "LONGTEXT").comment("成功的记录详情(JSON字符串)");
      table.specificType("failed_data", "LONGTEXT").comment("失败的记录详情(JSON字符串)");
      table.timestamp("created_at").defaultTo(db.fn.now()).index();
    });
    console.log("✅ Table 'bridge_sync_logs' created.");
  }
}

async function migrate() {
  try {
    // 首先初始化表
    await initSchema();

    console.log("\n🚀 Starting data migration from JSON5 to Database...");

    // 1. 迁移系统环境 (systemConfig.json5)
    const sysConfigPath = path.join(CONFIG_BASE_PATH, "systemConfig.json5");
    if (fs.existsSync(sysConfigPath)) {
      const content = fs.readFileSync(sysConfigPath, "utf-8");
      const { environments } = JSON5.parse(content);
      for (const env of environments) {
        await db("bridge_system_environments")
          .insert(env)
          .onConflict("id")
          .merge();
        console.log(`[SystemEnv] Migrated: ${env.id}`);
      }
    }

    // 2. 迁移租户和实体配置 (config/schools/*)
    const schoolsPath = path.join(CONFIG_BASE_PATH, "schools");
    if (fs.existsSync(schoolsPath)) {
      const tenantIds = fs
        .readdirSync(schoolsPath)
        .filter((f) => fs.statSync(path.join(schoolsPath, f)).isDirectory());

      for (const tenantId of tenantIds) {
        const tenantDir = path.join(schoolsPath, tenantId);

        // A. 迁移租户基础信息 (tenantConfig.json5)
        const tenantConfigPath = path.join(tenantDir, "tenantConfig.json5");
        if (fs.existsSync(tenantConfigPath)) {
          const content = fs.readFileSync(tenantConfigPath, "utf-8");
          const config = JSON5.parse(content);
          await db("bridge_tenants")
            .insert({
              tenant_id: tenantId,
              school_name: config.schoolName,
              status: config.status || "active",
              common_config: JSON.stringify(config.commonConfig || {}),
            })
            .onConflict("tenant_id")
            .merge();
          console.log(`[Tenant] Migrated: ${tenantId}`);
        }

        // B. 迁移实体配置 (*.json5 except tenantConfig)
        const entityFiles = fs
          .readdirSync(tenantDir)
          .filter((f) => f.endsWith(".json5") && f !== "tenantConfig.json5");
        for (const file of entityFiles) {
          const entityType = file.replace(".json5", "");
          const content = fs.readFileSync(path.join(tenantDir, file), "utf-8");
          const config = JSON5.parse(content);

          await db("bridge_entity_configs")
            .insert({
              tenant_id: tenantId,
              entity_type: entityType,
              data_source: JSON.stringify(config.dataSource),
              field_map: JSON.stringify(config.fieldMap),
              batch_config: JSON.stringify(config.batchConfig || {}),
              sync_config: JSON.stringify(config.syncConfig || {}),
            })
            .onConflict(["tenant_id", "entity_type"])
            .merge();
          console.log(`  [Entity] Migrated: ${tenantId}:${entityType}`);
        }
      }
    }

    console.log("\n✨ All done! Database is ready.");
  } catch (err) {
    console.error("❌ Operation failed:", err);
  } finally {
    await db.destroy();
  }
}

migrate();
