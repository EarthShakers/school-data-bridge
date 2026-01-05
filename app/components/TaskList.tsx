"use client";

import React from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  Table,
  Badge,
  Typography,
} from "antd";
import { SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

interface TaskListProps {
  taskData: { counts: any; jobs: any[] };
  loading: boolean;
  onRefresh: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  taskData,
  loading,
  onRefresh,
}) => {
  // 增加防御性容错
  const counts = taskData?.counts || {};
  const jobs = taskData?.jobs || [];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="等待中" value={counts.waiting || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="进行中"
              value={counts.active || 0}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={counts.completed || 0}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已失败"
              value={counts.failed || 0}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="延时中" value={counts.delayed || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Button
            icon={<SyncOutlined spin={loading} />}
            onClick={onRefresh}
            style={{ height: "100%", width: "100%" }}
          >
            刷新状态
          </Button>
        </Col>
      </Row>

      <Card title="实时任务队列 (最近 100 条)" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={jobs.map((j: any) => ({ ...j, key: j.id }))}
          loading={loading}
          size="small"
          pagination={{ pageSize: 15 }} // 增加分页，每页 15 条
          columns={[
            { title: "任务 ID", dataIndex: "id", key: "id", width: 220 },
            {
              title: "租户:实体",
              key: "target",
              render: (record) => (
                <Text strong>
                  {record.data.tenantId}:{record.data.entityType}
                </Text>
              ),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (status) => {
                const colorMap: any = {
                  active: "processing",
                  waiting: "warning",
                  completed: "success",
                  failed: "error",
                  delayed: "default",
                };
                return <Badge status={colorMap[status]} text={status} />;
              },
            },
            {
              title: "创建时间",
              dataIndex: "timestamp",
              render: (t) => dayjs(t).format("HH:mm:ss"),
            },
            {
              title: "完成时间",
              dataIndex: "finishedOn",
              render: (t) => (t ? dayjs(t).format("HH:mm:ss") : "-"),
            },
            {
              title: "错误原因",
              dataIndex: "failedReason",
              ellipsis: true,
              render: (r) => <Text type="danger">{r || "-"}</Text>,
            },
          ]}
        />
      </Card>
    </div>
  );
};
