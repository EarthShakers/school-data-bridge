"use client";

import React, { useEffect, useState } from "react";
import { TenantList } from "../components/TenantList";
import { useRouter } from "next/navigation";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((data) => setTenants(data.tenants || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: "bold" }}>租户管理</h2>
      </div>
      <TenantList
        tenants={tenants}
        loading={loading}
        onSelectTenant={(id) => router.push(`/tenants/${id}`)}
      />
    </div>
  );
}

