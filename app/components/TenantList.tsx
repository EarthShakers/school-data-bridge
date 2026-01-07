"use client";

import React, { useState } from "react";
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
  const [testStatus, setTestStatus] = useState<"none" | "success" | "error">(
    "none"
  );

  // 打开新增或编辑 Modal
  const showModal = async (tenantId?: string) => {
    form.resetFields();
    setTestStatus("none");
    if (tenantId) {
      setEditingTenantId(tenantId);
      // 优先填入 ID，防止 API 加载慢导致校验失败
      form.setFieldsValue({ tenantId });
      try {
        const res = await fetch(`/api/tenant-detail?tenantId=${tenantId}`);
        const data = await res.json();
        // 合并 API 返回的其他配置（如 schoolName, commonConfig 等）
        form.setFieldsValue(data);
      } catch (err) {
        message.error("加载租户配置失败");
      }
    } else {
      setEditingTenantId(null);
      form.setFieldsValue({ status: "active" });
    }
    setIsModalOpen(true);
  };

  const testDbConnection = async () => {
    const dbType = form.getFieldValue(["commonConfig", "dbType"]);
    const connectionString = form.getFieldValue([
      "commonConfig",
      "dbConnection",
    ]);

    if (!connectionString) {
      return message.warning("请先输入数据库连接字符串");
    }

    setTestingDb(true);
    setTestStatus("none");
    try {
      const res = await fetch("/api/test-db-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbType, connectionString }),
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

      // 如果是新增租户
      if (!editingTenantId) {
        const createRes = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values), // 👈 传整个 values 过去
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "创建租户失败");
        }
      } else {
        // 如果是编辑，才单独调用 detail 保存
        const saveRes = await fetch("/api/tenant-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!saveRes.ok) {
          message.error("保存详情失败");
          return;
        }
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
        width={700}
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
                  {
                    required: !editingTenantId,
                    message: "请输入租户 ID",
                  },
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

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={["commonConfig", "dbType"]}
                  label="数据库类型"
                  initialValue="mysql"
                >
                  <Select>
                    <Select.Option value="mysql">MySQL</Select.Option>
                    <Select.Option value="postgresql">PostgreSQL</Select.Option>
                    <Select.Option value="sqlserver">SQL Server</Select.Option>
                    <Select.Option value="oracle">Oracle</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  label="数据库连接字符串 (JDBC/Connection URL)"
                  required
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Input.Group compact style={{ flex: 1, display: "flex" }}>
                      <Form.Item
                        name={["commonConfig", "dbConnection"]}
                        noStyle
                        rules={[
                          { required: true, message: "请输入连接字符串" },
                        ]}
                      >
                        <Input
                          style={{ flex: 1 }}
                          placeholder="mysql://user:pass@host:3306/db"
                        />
                      </Form.Item>
                      <Button
                        style={{ width: "100px" }}
                        type="dashed"
                        loading={testingDb}
                        onClick={testDbConnection}
                      >
                        测试连接
                      </Button>
                    </Input.Group>
                    <div
                      style={{
                        width: "30px",
                        marginLeft: "8px",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
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
                    </div>
                  </div>
                </Form.Item>
              </Col>
            </Row>

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
            <TextArea
              rows={2}
              placeholder="记录租户入驻背景、对接人等信息..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
