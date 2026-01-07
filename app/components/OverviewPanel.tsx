import React, { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Typography, Form, Input, Button, message, Alert, Divider, Space } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  GlobalOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface OverviewPanelProps {
  tenantCount: number;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({ tenantCount }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/system-config")
      .then(res => res.json())
      .then(data => {
        if (data.environments) {
          form.setFieldsValue({ envs: data.environments });
        }
      });
  }, [form]);

  const handleSaveConfig = async (values: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environments: values.envs }),
      });
      if (res.ok) {
        message.success("全局环境配置已保存");
      } else {
        message.error("保存失败");
      }
    } catch (err) {
      message.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="累计处理记录" value={12840} valueStyle={{ color: "#3f8600" }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="今日同步失败" value={3} valueStyle={{ color: "#cf1322" }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="当前活跃租户" value={tenantCount} prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={16}>
          <Card 
            title={<span><GlobalOutlined /> 全局环境配置 (Java API Base URL)</span>}
            extra={<Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>保存全局配置</Button>}
          >
            <Alert message="可自定义环境 ID (如 dev/test) 及其对应的 Java 服务基础地址。" type="info" showIcon style={{ marginBottom: 20 }} />
            <Form form={form} layout="vertical" onFinish={handleSaveConfig}>
              <Form.List name="envs">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'id']}
                          rules={[{ required: true, message: 'ID 必填' }]}
                        >
                          <Input placeholder="环境 ID (如 dev)" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          rules={[{ required: true, message: '名称必填' }]}
                        >
                          <Input placeholder="环境名称 (如 开发环境)" style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'url']}
                          rules={[{ required: true, type: 'url', message: 'URL 格式错误' }]}
                        >
                          <Input placeholder="基础 URL (http://...)" style={{ width: 300 }} />
                        </Form.Item>
                        <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        新增环境
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="使用指引">
            <Typography.Paragraph>
              1. 在此配置 Java 写入端点。<br/>
              2. 每一个环境都包含一个 ID (用于内部流转) 和一个名称 (展示给用户)。<br/>
              3. 保存后，在租户详情页即可选择对应环境执行同步。
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
