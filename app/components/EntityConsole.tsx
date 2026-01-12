"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Badge,
  Space,
  Modal,
  Descriptions,
  Divider,
  Empty,
  Typography,
  Steps,
  Select,
  Form,
  Input,
  message,
  Tabs,
  Tag,
} from "antd";
import {
  SettingOutlined,
  SaveOutlined,
  SyncOutlined,
  HistoryOutlined,
  FileTextOutlined,
  CloudServerOutlined,
  EyeOutlined,
  LinkOutlined,
  DatabaseOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  BugOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import dayjs from "dayjs";
import JSON5 from "json5";
import { EnvironmentConfig } from "@/src/saveData/config";
import { useRouter } from "next/navigation";

if (typeof window !== "undefined") {
  const monacoBase = window.location.origin + "/monaco-vs/vs";
  loader.config({ paths: { vs: monacoBase } });

  // 确保 Worker 路径正确
  (window as any).MonacoEnvironment = {
    baseUrl: window.location.origin + "/monaco-vs/", // 👈 必须以 / 结尾，因为 workerMain.js 会拼接 "vs/loader.js"
    getWorkerUrl: function (_moduleId: any, label: string) {
      if (label === "json") {
        return `${monacoBase}/language/json/jsonWorker.js`;
      }
      if (label === "css" || label === "scss" || label === "less") {
        return `${monacoBase}/language/css/cssWorker.js`;
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return `${monacoBase}/language/html/htmlWorker.js`;
      }
      if (label === "typescript" || label === "javascript") {
        return `${monacoBase}/language/typescript/tsWorker.js`;
      }
      return `${monacoBase}/base/worker/workerMain.js`;
    },
  };
}

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "600px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        color: "#999",
      }}
    >
      正在初始化编辑器...
    </div>
  ),
});

const { Text, Paragraph, Title } = Typography;
const { Option } = Select;

interface EntityConsoleProps {
  tenantId: string;
  entityType: string;
}

export const EntityConsole: React.FC<EntityConsoleProps> = ({
  tenantId,
  entityType,
}) => {
  const router = useRouter();
  const [config, setConfig] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [targetEnv, setTargetEnv] = useState<string | undefined>(undefined);
  const [envs, setEnvs] = useState<EnvironmentConfig[]>([]);

  const fetchEnvironments = async () => {
    try {
      const res = await fetch("/api/system-config");
      const data = await res.json();
      if (data.environments) {
        setEnvs(data.environments);
        if (!targetEnv && data.environments.length > 0)
          setTargetEnv(data.environments[0].id);
      }
    } catch (err) {
      message.error("获取环境列表失败");
    }
  };

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(
        `/api/config?tenantId=${tenantId}&entityType=${entityType}`
      );
      const data = await res.json();
      if (data.content) setConfig(data.content);
    } catch (err) {
      message.error("加载配置失败");
    } finally {
      setLoadingConfig(false);
    }
  };

  const saveConfig = async () => {
    try {
      JSON5.parse(config);
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, entityType, content: config }),
      });
      if (res.ok) message.success("配置已保存");
      else message.error("保存失败");
    } catch (err: any) {
      message.error("保存失败: " + err.message);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(
        `/api/sync-logs?tenantId=${tenantId}&entityType=${entityType}`
      );
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      message.error("获取日志失败");
    } finally {
      setLoadingLogs(false);
    }
  };

  const viewLogDetail = async (logId: number) => {
    try {
      const res = await fetch(
        `/api/sync-logs?tenantId=${tenantId}&entityType=${entityType}&id=${logId}`
      );
      const data = await res.json();
      setSelectedLog(data);
      setLogModalVisible(true);
    } catch (err) {
      message.error("读取详细日志失败");
    }
  };

  const handleSync = async () => {
    if (!targetEnv) {
      message.warning("请先选择目标环境");
      return;
    }
    message.loading(`正在触发同步 [${targetEnv}]...`, 0);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, entityType, environment: targetEnv }),
      });
      message.destroy();
      if (res.ok) {
        message.success(`同步任务 [${targetEnv}] 已加入队列`);
        setTimeout(fetchLogs, 2000);
      } else message.error("任务触发失败");
    } catch (err) {
      message.destroy();
      message.error("网络错误");
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
    fetchEnvironments();
    const timer = setInterval(fetchLogs, 10000);
    return () => clearInterval(timer);
  }, [tenantId, entityType]);

  const logColumns = [
    {
      title: "同步时间",
      dataIndex: "time",
      render: (t: string) => dayjs(t).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "状态",
      key: "status",
      render: (record: any) => {
        const fetchStatus = record.stages?.fetch?.status;
        if (fetchStatus === "queued")
          return <Badge status="default" text="排队中..." />;
        if (fetchStatus === "running")
          return <Badge status="processing" text="执行中..." />;
        const hasError =
          record.summary?.failed > 0 ||
          fetchStatus === "failed" ||
          record.stages?.write?.failed > 0;
        const errorReason = record.stages?.fetch?.reason;
        return hasError ? (
          <Space>
            <Badge status="error" text="异常" />
            {errorReason && (
              <Text
                type="danger"
                style={{ fontSize: 11, maxWidth: 120 }}
                ellipsis={{ tooltip: errorReason }}
              >
                ({errorReason})
              </Text>
            )}
          </Space>
        ) : (
          <Badge status="success" text="完成" />
        );
      },
    },
    {
      title: "结果 (成功/总数)",
      key: "stat",
      render: (record: any) => (
        <Space>
          <Text
            strong
            style={{
              color:
                (record.stages?.write?.success ?? 0) > 0 ? "#52c41a" : "#999",
            }}
          >
            {record.stages?.write?.success ?? 0}
          </Text>
          <Text type="secondary">/</Text>
          <Text>{record.summary?.total ?? 0}</Text>
        </Space>
      ),
    },
    {
      title: "操作",
      render: (record: any) => (
        <Space>
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewLogDetail(record.id)}
          >
            详情
          </Button>
          <Button
            size="small"
            type="link"
            icon={<LinkOutlined />}
            onClick={() =>
              router.push(
                `/tasks?tenantId=${tenantId}&entityType=${entityType}&traceId=${record.traceId}`
              )
            }
          >
            任务队列
          </Button>
        </Space>
      ),
    },
  ];

  // 辅助函数：根据前缀拆分错误列表
  const getFailedSublist = (type: "zod" | "java") => {
    if (!selectedLog?.failedData) return [];
    return selectedLog.failedData.filter((d: any) => {
      const reason = d.reason;
      if (!reason) return false;
      if (type === "zod") return reason.includes("[数据校验]");
      return reason.includes("[Java业务]");
    });
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Row gutter={24}>
        <Col span={14}>
          <Card
            title={
              <span>
                <SettingOutlined /> 配置编辑 (JSON5)
              </span>
            }
            extra={
              <Space>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    try {
                      setConfig(JSON.stringify(JSON5.parse(config), null, 2));
                    } catch (e: any) {
                      message.warning("无法格式化：" + e.message);
                    }
                  }}
                >
                  格式化
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveConfig}
                  loading={loadingConfig}
                >
                  保存配置
                </Button>
              </Space>
            }
          >
            <div
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <Editor
                height="600px"
                language="json"
                value={config}
                theme="light"
                onChange={(value) => setConfig(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  formatOnPaste: true,
                }}
                path={`${tenantId}-${entityType}.json`}
              />
            </div>
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title={
              <span>
                <SyncOutlined /> 任务控制
              </span>
            }
            style={{ marginBottom: 24 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                <CloudServerOutlined /> 目标写入环境:
              </Text>
              <Select
                placeholder="请选择 Java 服务环境"
                style={{ width: "100%" }}
                value={targetEnv}
                onChange={setTargetEnv}
              >
                {envs.map((env) => (
                  <Option key={env.id} value={env.id}>
                    {env.name}
                  </Option>
                ))}
              </Select>
            </div>
            <Button
              type="primary"
              danger
              icon={<SyncOutlined />}
              block
              size="large"
              disabled={!targetEnv}
              onClick={handleSync}
            >
              立即执行手动同步
            </Button>
          </Card>
          <Card
            title={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <HistoryOutlined /> 最近执行记录
                </span>
                <Button
                  size="small"
                  icon={<SyncOutlined spin={loadingLogs} />}
                  onClick={fetchLogs}
                >
                  刷新
                </Button>
              </div>
            }
          >
            <Table
              dataSource={logs.sort(
                (a, b) =>
                  new Date(b.time).getTime() - new Date(a.time).getTime()
              )}
              columns={logColumns}
              size="small"
              loading={loadingLogs}
              pagination={{ pageSize: 5 }}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <Title level={4} style={{ margin: 0 }}>
            同步详情 [TraceID: {selectedLog?.traceId}]
          </Title>
        }
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={1400}
      >
        {selectedLog && (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: "overview",
                label: "执行概览",
                children: (
                  <div>
                    <div style={{ padding: "20px 0 30px" }}>
                      <Steps
                        current={3}
                        items={[
                          {
                            title: "1. 抓取数据",
                            description: `记录: ${
                              selectedLog.stages?.fetch?.total || 0
                            }`,
                            status:
                              selectedLog.stages?.fetch?.status === "success"
                                ? "finish"
                                : "error",
                          },
                          {
                            title: "2. 转换校验",
                            description: `通过: ${
                              selectedLog.stages?.transform?.success || 0
                            } / 失败: ${
                              selectedLog.stages?.transform?.failed || 0
                            }`,
                            status:
                              (selectedLog.stages?.transform?.failed || 0) > 0
                                ? "error"
                                : "finish",
                          },
                          {
                            title: "3. 写入后端",
                            description: `成功: ${
                              selectedLog.stages?.write?.success || 0
                            } / 失败: ${
                              selectedLog.stages?.write?.failed || 0
                            }`,
                            status:
                              (selectedLog.stages?.write?.failed || 0) > 0
                                ? "error"
                                : "finish",
                          },
                        ]}
                      />
                    </div>

                    <Row gutter={16}>
                      <Col span={6}>
                        <Divider orientation="left">
                          <DatabaseOutlined /> 1. 抓取元数据
                        </Divider>
                        <div
                          style={{
                            background: "#f0f2f5",
                            padding: 12,
                            borderRadius: 4,
                            height: 500,
                            overflow: "auto",
                          }}
                        >
                          {selectedLog.rawDataSample ? (
                            <pre style={{ fontSize: 10 }}>
                              {JSON.stringify(
                                selectedLog.rawDataSample,
                                null,
                                2
                              )}
                            </pre>
                          ) : (
                            <Empty description="未采集" />
                          )}
                        </div>
                      </Col>
                      <Col span={6}>
                        <Divider orientation="left">
                          <CheckCircleOutlined /> 2. 写入成功记录
                        </Divider>
                        <div
                          style={{
                            background: "#f6ffed",
                            padding: 12,
                            borderRadius: 4,
                            height: 500,
                            overflow: "auto",
                            border: "1px solid #b7eb8f",
                          }}
                        >
                          {selectedLog.successData?.length > 0 ? (
                            <pre style={{ fontSize: 10 }}>
                              {JSON.stringify(selectedLog.successData, null, 2)}
                            </pre>
                          ) : (
                            <Empty description="无入库数据" />
                          )}
                        </div>
                      </Col>
                      <Col span={6}>
                        <Divider orientation="left">
                          <WarningOutlined style={{ color: "#faad14" }} /> 3.
                          Java 业务失败
                        </Divider>
                        <div style={{ height: 500, overflow: "auto" }}>
                          <Table
                            dataSource={getFailedSublist("java").map(
                              (d: any, i: number) => ({ ...d, key: i })
                            )}
                            size="small"
                            pagination={false}
                            columns={[
                              {
                                title: "ID",
                                dataIndex: ["data", "id"],
                                width: 80,
                              },
                              {
                                title: "Java 报错原因",
                                dataIndex: "reason",
                                render: (r) => (
                                  <Text type="warning" style={{ fontSize: 10 }}>
                                    {r.replace("[Java业务] ", "")}
                                  </Text>
                                ),
                              },
                            ]}
                          />
                        </div>
                      </Col>
                      <Col span={6}>
                        <Divider orientation="left">
                          <ExclamationCircleOutlined
                            style={{ color: "#ff4d4f" }}
                          />{" "}
                          4. Zod 校验失败
                        </Divider>
                        <div style={{ height: 500, overflow: "auto" }}>
                          <Table
                            dataSource={getFailedSublist("zod").map(
                              (d: any, i: number) => ({ ...d, key: i })
                            )}
                            size="small"
                            pagination={false}
                            columns={[
                              {
                                title: "记录",
                                dataIndex: ["data", "id"],
                                width: 80,
                                render: (id: any, row: any) =>
                                  id || `Row ${row.key}`,
                              },
                              {
                                title: "格式错误",
                                dataIndex: "reason",
                                render: (r) => (
                                  <Text type="danger" style={{ fontSize: 10 }}>
                                    {r.replace("[数据校验] ", "")}
                                  </Text>
                                ),
                              },
                            ]}
                          />
                        </div>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: "debug",
                label: (
                  <span>
                    <BugOutlined /> 接口排查 (Debug)
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Divider orientation="left">发送 Payload</Divider>
                      <div
                        style={{
                          background: "#1e1e1e",
                          color: "#d4d4d4",
                          padding: 12,
                          borderRadius: 4,
                          height: 550,
                          overflow: "auto",
                        }}
                      >
                        <pre style={{ fontSize: 12 }}>
                          {JSON.stringify(
                            selectedLog.writeFailureDetails?.lastPayload,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </Col>
                    <Col span={12}>
                      <Divider orientation="left">返回 Response</Divider>
                      <div
                        style={{
                          background: "#1e1e1e",
                          color: "#ce9178",
                          padding: 12,
                          borderRadius: 4,
                          height: 550,
                          overflow: "auto",
                        }}
                      >
                        <pre style={{ fontSize: 12 }}>
                          {JSON.stringify(
                            selectedLog.writeFailureDetails?.lastResponse,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};
