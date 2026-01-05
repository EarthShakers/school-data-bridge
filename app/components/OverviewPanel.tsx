"use client";

import React from "react";
import { Row, Col, Card, Statistic, Typography } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";

interface OverviewPanelProps {
  tenantCount: number;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({ tenantCount }) => {
  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="累计处理记录"
              value={12840}
              precision={0}
              valueStyle={{ color: "#3f8600" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="今日同步失败"
              value={3}
              valueStyle={{ color: "#cf1322" }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="当前活跃租户"
              value={tenantCount}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Card title="系统公告">
        <Typography.Paragraph>
          欢迎使用 School Data Bridge 调度系统。请在“租户管理”中配置各学校的数据源。
        </Typography.Paragraph>
      </Card>
    </div>
  );
};

