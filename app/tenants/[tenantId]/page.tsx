"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, Typography, Breadcrumb, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { EntityConsole } from "../../components/EntityConsole";

const { Title, Text } = Typography;

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  const fetchTenantData = () => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((data) => {
        const found = data.tenants.find((t: any) => t.tenantId === tenantId);
        setTenantInfo(found);
      });
  };

  useEffect(() => {
    fetchTenantData();
  }, [tenantId]);

  if (!tenantInfo) return <div>加载中...</div>;

  const tabItems = tenantInfo.entities.map((entity: string) => ({
    key: entity,
    label: entity.toUpperCase(),
    children: <EntityConsole tenantId={tenantId} entityType={entity} />,
  }));

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item
          onClick={() => router.push("/overview")}
          className="cursor-pointer"
        >
          首页
        </Breadcrumb.Item>
        <Breadcrumb.Item
          onClick={() => router.push("/tenants")}
          className="cursor-pointer"
        >
          租户管理
        </Breadcrumb.Item>
        <Breadcrumb.Item>{tenantId}</Breadcrumb.Item>
      </Breadcrumb>

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/tenants")}
            style={{ marginRight: 16 }}
          />
          <div>
            <Title level={2} style={{ margin: 0 }}>
              {tenantId}
              <Text
                type="secondary"
                style={{ fontSize: 16, fontWeight: "normal", marginLeft: 12 }}
              >
                数据流水线管理
              </Text>
            </Title>
          </div>
        </div>
      </div>

      <Tabs type="card" items={tabItems} />
    </div>
  );
}
