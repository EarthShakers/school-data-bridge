"use client";

import React, { useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  Table,
  Badge,
  Typography,
  Input,
  Space,
} from "antd";
import { SyncOutlined, SearchOutlined } from "@ant-design/icons";
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
  const [searchText, setSearchText] = useState("");

  // 增加防御性容错
  const counts = taskData?.counts || {};
  const jobs = taskData?.jobs || [];

  // 获取所有可用的实体类型用于过滤
  const uniqueEntities = Array.from(
    new Set(jobs.map((j) => j.data?.entityType))
  ).filter(Boolean);

  const columns: any = [
    {
      title: "任务 ID",
      dataIndex: "id",
      key: "id",
      width: 200,
      ellipsis: true,
    },
    {
      title: "租户",
      key: "tenantId",
      render: (record: any) => record.data?.tenantId || "-",
      // 租户搜索过滤
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }: any) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="搜索租户 ID"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              搜索
            </Button>
            <Button
              onClick={() => clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              重置
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
      ),
      onFilter: (value: string, record: any) =>
        record.data?.tenantId
          ?.toString()
          .toLowerCase()
          .includes(value.toLowerCase()),
    },
    {
      title: "实体类型",
      key: "entityType",
      render: (record: any) => (
        <Badge status="default" text={record.data?.entityType || "-"} />
      ),
      // 实体类型筛选
      filters: uniqueEntities.map((e) => ({ text: e, value: e })),
      onFilter: (value: string, record: any) =>
        record.data?.entityType === value,
    },
    {
      title: "目标环境",
      key: "environment",
      render: (record: any) => record.data?.environment || "-",
      onFilter: (value: string, record: any) =>
        record.data?.environment === value,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colorMap: any = {
          active: "processing",
          waiting: "warning",
          completed: "success",
          failed: "error",
          delayed: "default",
        };
        return <Badge status={colorMap[status]} text={status} />;
      },
      filters: [
        { text: "active", value: "active" },
        { text: "waiting", value: "waiting" },
        { text: "completed", value: "completed" },
        { text: "failed", value: "failed" },
      ],
      onFilter: (value: string, record: any) => record.status === value,
    },
    {
      title: "创建时间",
      dataIndex: "timestamp",
      key: "timestamp",
      sorter: (a: any, b: any) => a.timestamp - b.timestamp,
      render: (t: number) => dayjs(t).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "完成时间",
      dataIndex: "finishedOn",
      key: "finishedOn",
      sorter: (a: any, b: any) => (a.finishedOn || 0) - (b.finishedOn || 0),
      render: (t: number) => (t ? dayjs(t).format("YYYY-MM-DD HH:mm:ss") : "-"),
    },
    {
      title: "失败原因",
      dataIndex: "failedReason",
      key: "failedReason",
      ellipsis: true,
      render: (r: string) => (r ? <Text type="danger">{r}</Text> : "-"),
    },
  ];

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
            强制刷新
          </Button>
        </Col>
      </Row>

      <Card title="实时任务队列 (最近 100 条)" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={jobs.map((j: any) => ({ ...j, key: j.id }))}
          loading={loading}
          size="small"
          pagination={{ pageSize: 15 }}
          columns={columns}
        />
      </Card>
    </div>
  );
};
