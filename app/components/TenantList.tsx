"use client";

import React from "react";
import { Card, Table, Tag, Button } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";

interface TenantListProps {
  tenants: any[];
  loading: boolean;
  onSelectTenant: (tenantId: string) => void;
}

export const TenantList: React.FC<TenantListProps> = ({
  tenants,
  loading,
  onSelectTenant,
}) => {
  return (
    <Card title="租户管理" bodyStyle={{ padding: 0 }}>
      <Table
        dataSource={tenants.map((t, i) => ({ ...t, key: i }))}
        loading={loading}
        columns={[
          { title: "租户 ID", dataIndex: "tenantId", key: "tenantId" },
          {
            title: "包含实体",
            dataIndex: "entities",
            render: (entities: string[]) =>
              entities.map((e) => (
                <Tag color="blue" key={e}>
                  {e}
                </Tag>
              )),
          },
          {
            title: "操作",
            key: "action",
            render: (record) => (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={() => onSelectTenant(record.tenantId)}
              >
                进入数据控制台
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
};

