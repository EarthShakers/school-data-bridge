"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  message,
  Typography,
  Form,
  Select,
  Space,
  Row,
  Col,
  Alert,
} from "antd";
import {
  ArrowRightOutlined,
  PlusOutlined,
  EditOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

interface TenantListProps {
  tenants: any[];
  loading: boolean;
  onSelectTenant: (tenantId: string) => void;
  onRefresh: () => void;
}

export const TenantList: React.FC<TenantListProps> = ({
  tenants,
  loading,
  onSelectTenant,
  onRefresh,
}) => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const showModal = async (tenantId?: string) => {
    form.resetFields();
    setTestStatus("idle");
    if (tenantId) {
      setEditingTenantId(tenantId);
      form.setFieldsValue({ tenantId });
      try {
        const res = await fetch(`/api/tenant-detail?tenantId=${tenantId}`);
        const data = await res.json();
        // 自动识别连接模式
        const commonConfig = data.commonConfig || {};
        const connMode = commonConfig.dbHost ? "params" : "string";
        form.setFieldsValue({
          ...data,
          commonConfig: { ...commonConfig, connMode },
        });
      } catch (err) {
        message.error("加载租户配置失败");
      }
    } else {
      setEditingTenantId(null);
      form.setFieldsValue({
        status: "active",
        commonConfig: { dbType: "mysql", connMode: "string" },
      });
    }
    setIsModalOpen(true);
  };

  const testDbConnection = async () => {
    setTestStatus("idle");
    const commonConfig = form.getFieldValue("commonConfig");
    const {
      dbType,
      connMode,
      dbConnection,
      dbHost,
      dbPort,
      dbUser,
      dbPass,
      dbName,
    } = commonConfig;

    let connectionInfo: any = dbConnection;
    if (connMode === "params") {
      if (!dbHost || !dbPort || !dbName)
        return message.warning("请完善数据库连接信息");
      connectionInfo = {
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPass,
        database: dbName,
      };
    } else {
      if (!dbConnection) return message.warning("请先输入数据库连接字符串");
    }

    setTestingDb(true);
    try {
      const res = await fetch("/api/test-db-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbType, connection: connectionInfo }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        setTestStatus("success");
      } else {
        message.error(`连接失败: ${data.error}`);
        setTestStatus("error");
      }
    } catch (err) {
      message.error("请求失败，请稍后重试");
      setTestStatus("error");
    } finally {
      setTestingDb(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);

      if (!editingTenantId) {
        const createRes = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "创建租户失败");
        }
      } else {
        const saveRes = await fetch("/api/tenant-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!saveRes.ok) throw new Error("保存详情失败");
      }

      message.success(editingTenantId ? "更新成功" : "创建并初始化成功");
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      message.error(err.message || "操作失败");
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: "学校名称",
      dataIndex: "schoolName",
      key: "schoolName",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    { title: "租户 ID", dataIndex: "tenantId", key: "tenantId" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "active" ? "green" : "red"}>
          {status === "active" ? "运行中" : "已禁用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (record: any) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showModal(record.tenantId)}
          >
            编辑配置
          </Button>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => onSelectTenant(record.tenantId)}
          >
            数据流水线
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="租户管理"
      bodyStyle={{ padding: 0 }}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
        >
          新增租户
        </Button>
      }
    >
      <Table
        dataSource={tenants.map((t, i) => ({ ...t, key: i }))}
        loading={loading}
        columns={columns}
      />

      <Modal
        title={editingTenantId ? `编辑租户: ${editingTenantId}` : "新增租户"}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={confirmLoading}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tenantId"
                label="租户 ID (唯一标识)"
                rules={[
                  { required: !editingTenantId, message: "请输入租户 ID" },
                ]}
              >
                <Input
                  placeholder="例如: school_001"
                  disabled={!!editingTenantId}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="schoolName"
                label="学校全称"
                rules={[{ required: true, message: "请输入学校名称" }]}
              >
                <Input placeholder="例如: 某某省第一实验小学" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="同步状态">
                <Select>
                  <Select.Option value="active">运行中 (Active)</Select.Option>
                  <Select.Option value="inactive">
                    已禁用 (Inactive)
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Card
            size="small"
            title="共享资源配置 (对该租户下所有实体生效)"
            style={{ background: "#fafafa" }}
          >
            <Form.Item
              name={["commonConfig", "apiBaseUrl"]}
              label="API 基础 URL"
            >
              <Input placeholder="https://api.school.edu" />
            </Form.Item>

            <Row gutter={16} align="middle">
              <Col span={8}>
                <Form.Item name={["commonConfig", "dbType"]} label="数据库类型">
                  <Select>
                    <Select.Option value="mysql">MySQL</Select.Option>
                    <Select.Option value="postgresql">PostgreSQL</Select.Option>
                    <Select.Option value="sqlserver">SQL Server</Select.Option>
                    <Select.Option value="oracle">Oracle</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name={["commonConfig", "connMode"]} label="连接模式">
                  <Select>
                    <Select.Option value="string">
                      连接字符串 (URL)
                    </Select.Option>
                    <Select.Option value="params">
                      分项参数 (Host/Port)
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col
                span={8}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: 8, // 抵消 Form.Item label 的大概高度
                }}
              >
                <Space>
                  <Button
                    type="dashed"
                    loading={testingDb}
                    onClick={testDbConnection}
                  >
                    测试连接
                  </Button>
                  {testStatus === "success" && (
                    <CheckCircleFilled
                      style={{ color: "#52c41a", fontSize: "18px" }}
                    />
                  )}
                  {testStatus === "error" && (
                    <CloseCircleFilled
                      style={{ color: "#ff4d4f", fontSize: "18px" }}
                    />
                  )}
                </Space>
              </Col>
            </Row>

            <Form.Item
              noStyle
              shouldUpdate={(p, c) =>
                p.commonConfig?.connMode !== c.commonConfig?.connMode
              }
            >
              {({ getFieldValue }) => {
                const mode = getFieldValue(["commonConfig", "connMode"]);
                return mode === "string" ? (
                  <Form.Item
                    name={["commonConfig", "dbConnection"]}
                    label="连接字符串"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="mysql://user:pass@host:3306/db" />
                  </Form.Item>
                ) : (
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item
                        name={["commonConfig", "dbHost"]}
                        label="主机"
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="127.0.0.1" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        name={["commonConfig", "dbPort"]}
                        label="端口"
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="3306" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name={["commonConfig", "dbName"]}
                        label="库名"
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="db_name" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name={["commonConfig", "dbUser"]}
                        label="用户名"
                      >
                        <Input placeholder="root" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={["commonConfig", "dbPass"]} label="密码">
                        <Input.Password placeholder="password" />
                      </Form.Item>
                    </Col>
                  </Row>
                );
              }}
            </Form.Item>

            <Form.Item
              name={["commonConfig", "apiAuthToken"]}
              label="默认 Auth Token / API Key"
            >
              <Input.Password placeholder="用于鉴权的 Token" />
            </Form.Item>
          </Card>

          <Form.Item
            name="description"
            label="备注说明"
            style={{ marginTop: 16 }}
          >
            <TextArea rows={2} placeholder="记录租户入驻背景等信息..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
