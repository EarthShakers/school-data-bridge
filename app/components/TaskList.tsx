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
  Modal,
} from "antd";
import { SyncOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

const { Text, Paragraph } = Typography;

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Shanghai");

function formatBeijingTime(input?: number | string) {
  if (!input) return "-";
  // BullMQ timestamp/finishedOn 是 ms number；日志/接口也可能是 ISO string
  return dayjs(input).tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss");
}

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
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [currentError, setCurrentError] = useState("");

  const showReason = (reason: string) => {
    setCurrentError(reason);
    setErrorModalVisible(true);
  };

  // 增加防御性容错
  const counts = taskData?.counts || {};
  const jobs = taskData?.jobs || [];
  const sortedJobs = [...jobs].sort(
    (a: any, b: any) => (b?.timestamp || 0) - (a?.timestamp || 0)
  );

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
      title: "traceId",
      render: (record: any) => record.data?.traceId || "-",
      key: "traceId",
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
      defaultSortOrder: "descend",
      sorter: (a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0),
      render: (t: number) => formatBeijingTime(t),
    },
    {
      title: "完成时间",
      dataIndex: "finishedOn",
      key: "finishedOn",
      sorter: (a: any, b: any) => (a.finishedOn || 0) - (b.finishedOn || 0),
      render: (t: number) => formatBeijingTime(t),
    },
    {
      title: "失败原因",
      key: "failedReason",
      width: 320,
      render: (record: any) => {
        const r = record.failedReason;
        const isFailed = record.status === "failed";
        if (!r || !isFailed) return "-";
        return (
          <div style={{ paddingRight: 10 }}>
            <Space size={4}>
              <Text
                type="danger"
                style={{ maxWidth: 180 }}
                ellipsis={{ tooltip: r }}
              >
                {r}
              </Text>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => showReason(r)}
                style={{ padding: "0 4px" }}
              >
                查看详情
              </Button>
            </Space>
          </div>
        );
      },
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
          dataSource={sortedJobs.map((j: any) => ({ ...j, key: j.id }))}
          loading={loading}
          size="small"
          pagination={{ pageSize: 15 }}
          columns={columns}
        />
      </Card>

      <Modal
        title="任务失败详细原因"
        open={errorModalVisible}
        onCancel={() => setErrorModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setErrorModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <div
          style={{
            background: "#fff1f0",
            padding: "16px 24px",
            borderRadius: 4,
            border: "1px solid #ffa39e",
            maxHeight: "500px",
            overflowY: "auto",
          }}
        >
          <Paragraph
            copyable
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: "13px",
            }}
          >
            {currentError}
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
};
