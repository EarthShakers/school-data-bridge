"use client";

import React, { useEffect, useState } from "react";
import { OverviewPanel } from "../components/OverviewPanel";

export default function OverviewPage() {
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((data) => setTenants(data.tenants || []));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: "bold" }}>系统概览</h2>
      </div>
      <OverviewPanel tenantCount={tenants.length} />
    </div>
  );
}

