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
} from "@ant-design/icons";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import dayjs from "dayjs";
import JSON5 from "json5";
import { EnvironmentConfig } from "@/src/saveData/config";
import { useRouter } from "next/navigation";

// 配置 Monaco 使用本地资源
if (typeof window !== "undefined") {
  loader.config({
    paths: {
      vs: window.location.origin + "/monaco-vs",
    },
  });
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
        if (!targetEnv && data.environments.length > 0) {
          setTargetEnv(data.environments[0].id);
        }
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
      } else {
        message.error("任务触发失败");
      }
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
      title: "统计 (成功/总数)",
      key: "stat",
      render: (record: any) => {
        const success = record.stages?.write?.success ?? 0;
        const total = record.summary?.total ?? 0;
        return (
          <Space>
            <Text strong style={{ color: success > 0 ? "#52c41a" : "#999" }}>
              {success}
            </Text>
            <Text type="secondary">/</Text>
            <Text>{total}</Text>
          </Space>
        );
      },
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
                // @ts-ignore
                path="/monaco-vs"
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
        width={1200}
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
                            title: "1. 抓取元数据",
                            description: `获取原始记录: ${
                              selectedLog.stages?.fetch?.total || 0
                            }`,
                            status:
                              selectedLog.stages?.fetch?.status === "success"
                                ? "finish"
                                : "error",
                          },
                          {
                            title: "2. 数据转换校验",
                            description: `合法: ${
                              selectedLog.stages?.transform?.success || 0
                            } / 非法: ${
                              selectedLog.stages?.transform?.failed || 0
                            }`,
                            status:
                              (selectedLog.stages?.transform?.failed || 0) > 0
                                ? "error"
                                : "finish",
                          },
                          {
                            title: "3. 写入 Java 服务",
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
                      <Col span={8}>
                        <Divider orientation="left">
                          <DatabaseOutlined /> 1. 抓取元数据样本 (前500条)
                        </Divider>
                        <div
                          style={{
                            background: "#f0f2f5",
                            padding: 12,
                            borderRadius: 4,
                            height: 400,
                            overflow: "auto",
                          }}
                        >
                          {selectedLog.rawDataSample &&
                          selectedLog.rawDataSample.length > 0 ? (
                            <pre style={{ fontSize: 11 }}>
                              {JSON.stringify(
                                selectedLog.rawDataSample,
                                null,
                                2
                              )}
                            </pre>
                          ) : (
                            <Empty description="未采集到元数据" />
                          )}
                        </div>
                      </Col>
                      <Col span={1}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            justifyContent: "center",
                          }}
                        >
                          <ArrowRightOutlined
                            style={{ color: "#bfbfbf", fontSize: 20 }}
                          />
                        </div>
                      </Col>
                      <Col span={7}>
                        <Divider orientation="left">
                          <CheckCircleOutlined /> 2. 转换成功数据
                        </Divider>
                        <div
                          style={{
                            background: "#f6ffed",
                            padding: 12,
                            borderRadius: 4,
                            height: 400,
                            overflow: "auto",
                            border: "1px solid #b7eb8f",
                          }}
                        >
                          {selectedLog.successData &&
                          selectedLog.successData.length > 0 ? (
                            <pre style={{ fontSize: 11 }}>
                              {JSON.stringify(selectedLog.successData, null, 2)}
                            </pre>
                          ) : (
                            <Empty description="无转换成功数据" />
                          )}
                        </div>
                      </Col>
                      <Col span={8}>
                        <Divider orientation="left">
                          <ExclamationCircleOutlined
                            style={{ color: "#ff4d4f" }}
                          />{" "}
                          3. 转换失败详情
                        </Divider>
                        <div style={{ height: 400, overflow: "auto" }}>
                          {selectedLog.failedData &&
                          selectedLog.failedData.length > 0 ? (
                            <Table
                              dataSource={selectedLog.failedData.map(
                                (d: any, i: number) => ({ ...d, key: i })
                              )}
                              size="small"
                              pagination={{ pageSize: 10 }}
                              columns={[
                                {
                                  title: "记录 ID",
                                  dataIndex: ["data", "id"],
                                  width: 100,
                                },
                                {
                                  title: "失败原因 (Zod Error)",
                                  dataIndex: "reason",
                                  render: (r) => (
                                    <Paragraph
                                      ellipsis={{
                                        rows: 2,
                                        expandable: true,
                                        symbol: "展开",
                                      }}
                                      style={{
                                        fontSize: 11,
                                        color: "#ff4d4f",
                                        margin: 0,
                                      }}
                                    >
                                      {typeof r === "string"
                                        ? r
                                        : JSON.stringify(r)}
                                    </Paragraph>
                                  ),
                                },
                              ]}
                            />
                          ) : (
                            <Empty description="没有失败记录" />
                          )}
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
                    <BugOutlined /> Java 接口排查
                  </span>
                ),
                children: (
                  <div>
                    {selectedLog.writeFailureDetails ? (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Divider orientation="left">
                            发送 Payload 报文
                          </Divider>
                          <div
                            style={{
                              background: "#1e1e1e",
                              color: "#d4d4d4",
                              padding: 12,
                              borderRadius: 4,
                              height: 500,
                              overflow: "auto",
                            }}
                          >
                            <pre style={{ fontSize: 12 }}>
                              {JSON.stringify(
                                selectedLog.writeFailureDetails.lastPayload,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Divider orientation="left">
                            Java 返回 Response
                          </Divider>
                          <div
                            style={{
                              background: "#1e1e1e",
                              color: "#ce9178",
                              padding: 12,
                              borderRadius: 4,
                              height: 500,
                              overflow: "auto",
                            }}
                          >
                            <pre style={{ fontSize: 12 }}>
                              {JSON.stringify(
                                selectedLog.writeFailureDetails.lastResponse,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </Col>
                      </Row>
                    ) : (
                      <div style={{ padding: 40, textAlign: "center" }}>
                        <CheckCircleOutlined
                          style={{
                            fontSize: 48,
                            color: "#52c41a",
                            marginBottom: 16,
                          }}
                        />
                        <Title level={5}>此任务没有 Java 接口级报错</Title>
                        <Text type="secondary">
                          如果统计显示写入失败，通常是由于部分数据未通过 Java
                          的业务校验，请查看概览页的失败详情。
                        </Text>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};
