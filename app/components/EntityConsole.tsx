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
  message,
  Steps,
  Select,
} from "antd";
import {
  SettingOutlined,
  SaveOutlined,
  SyncOutlined,
  HistoryOutlined,
  FileTextOutlined,
  CloudServerOutlined,
} from "@ant-design/icons";
import Editor from "@monaco-editor/react";
import dayjs from "dayjs";
import JSON5 from "json5";

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface EntityConsoleProps {
  tenantId: string;
  entityType: string;
}

export const EntityConsole: React.FC<EntityConsoleProps> = ({
  tenantId,
  entityType,
}) => {
  const [config, setConfig] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [targetEnv, setTargetEnv] = useState<string | undefined>(undefined);
  const [envs, setEnvs] = useState<any[]>([]);

  const fetchEnvs = async () => {
    try {
      const res = await fetch("/api/system-config");
      const data = await res.json();
      if (data.environments && data.environments.length > 0) {
        setEnvs(data.environments);
        // 如果还没有选环境，默认选中第一个
        if (!targetEnv) {
          setTargetEnv(data.environments[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch envs", e);
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
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, entityType, content: config }),
      });
      if (res.ok) message.success("配置已保存");
      else message.error("保存失败");
    } catch (err) {
      message.error("保存失败");
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(
        `/api/logs?tenantId=${tenantId}&entityType=${entityType}`
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
        `/api/logs?tenantId=${tenantId}&entityType=${entityType}&id=${logId}`
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
    fetchEnvs();

    const timer = setInterval(() => {
      fetchLogs();
    }, 10000);

    return () => clearInterval(timer);
  }, [tenantId, entityType]);

  const logColumns = [
    {
      title: "同步时间",
      dataIndex: "time",
      render: (t: string) => dayjs(t).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "统计",
      dataIndex: "summary",
      render: (s: any) => (
        <Space>
          <Badge status="processing" text={`总数: ${s.total}`} />
          <Badge status="success" text={`成功: ${s.success}`} />
          <Badge status="error" text={`失败: ${s.failed}`} />
        </Space>
      ),
    },
    {
      title: "操作",
      render: (record: any) => (
        <Button
          size="small"
          type="link"
          onClick={() => viewLogDetail(record.id)}
        >
          详情
        </Button>
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
                      const json = JSON5.parse(config);
                      setConfig(JSON.stringify(json, null, 2));
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
                {envs.length > 0 &&
                  envs.map((env) => (
                    <Option key={env.id} value={env.id}>
                      {env.name}
                    </Option>
                  ))}
              </Select>
            </div>
            <Paragraph>
              <Text type="secondary">配置修改后请先点击保存，再执行同步。</Text>
            </Paragraph>
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
              rowKey="filename"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="同步执行全流程详情"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedLog && (
          <div>
            <div style={{ padding: "20px 0 40px" }}>
              <Steps
                current={3}
                items={[
                  {
                    title: "数据抓取",
                    description: `抓取总数: ${
                      selectedLog.stages?.fetch?.total || 0
                    }`,
                    status:
                      selectedLog.stages?.fetch?.status === "success"
                        ? "finish"
                        : "error",
                  },
                  {
                    title: "数据转换与校验",
                    description: (
                      <div>
                        <Text type="success">
                          成功: {selectedLog.stages?.transform?.success || 0}
                        </Text>
                        <br />
                        <Text type="danger">
                          失败: {selectedLog.stages?.transform?.failed || 0}
                        </Text>
                      </div>
                    ),
                    status:
                      (selectedLog.stages?.transform?.failed || 0) > 0
                        ? "error"
                        : "finish",
                  },
                  {
                    title: "写入 Java 服务",
                    description: (
                      <div>
                        <Text type="success">
                          写入: {selectedLog.stages?.write?.success || 0}
                        </Text>
                        <br />
                        <Text type="danger">
                          失败: {selectedLog.stages?.write?.failed || 0}
                        </Text>
                      </div>
                    ),
                    status:
                      (selectedLog.stages?.write?.failed || 0) > 0
                        ? "error"
                        : "finish",
                  },
                ]}
              />
            </div>

            <Descriptions title="汇总统计" bordered size="small" column={3}>
              <Descriptions.Item label="原始总数">
                {selectedLog.summary.total}
              </Descriptions.Item>
              <Descriptions.Item label="通过校验">
                {selectedLog.summary.success}
              </Descriptions.Item>
              <Descriptions.Item label="入库成功">
                {selectedLog.stages?.write?.success || 0}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">失败记录 (前 50 条)</Divider>
            {selectedLog.failedData.length > 0 ? (
              <Table
                dataSource={selectedLog.failedData
                  .slice(0, 50)
                  .map((d: any, i: number) => ({ ...d, key: i }))}
                size="small"
                columns={[
                  {
                    title: "原始数据",
                    dataIndex: "data",
                    render: (d) => (
                      <pre style={{ fontSize: 10 }}>
                        {JSON.stringify(d, null, 2)}
                      </pre>
                    ),
                  },
                  {
                    title: "原因",
                    dataIndex: "reason",
                    render: (r) => (
                      <Text type="danger">{JSON.stringify(r)}</Text>
                    ),
                  },
                ]}
                pagination={false}
              />
            ) : (
              <Empty description="没有失败记录" />
            )}

            <Divider orientation="left">成功数据样本 (前 5 条)</Divider>
            <pre
              style={{
                background: "#f5f5f5",
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {JSON.stringify(selectedLog.successData.slice(0, 5), null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};
