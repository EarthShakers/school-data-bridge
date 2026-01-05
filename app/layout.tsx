"use client";

import React from "react";
import { Layout, Menu, Typography, ConfigProvider } from "antd";
import {
  PieChartOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  BankOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import zhCN from "antd/locale/zh_CN";
import "./globals.css";

const { Header, Content, Sider, Footer } = Layout;
const { Title } = Typography;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 根据路径计算选中的菜单项
  const getSelectedKey = () => {
    if (pathname.startsWith("/overview")) return "overview";
    if (pathname.startsWith("/tenants")) return "tenants";
    if (pathname.startsWith("/tasks")) return "tasks";
    return "overview";
  };

  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider locale={zhCN}>
            <Layout style={{ minHeight: "100vh" }}>
              <Sider width={200} theme="dark" style={{ position: "fixed", height: "100vh", left: 0 }}>
                <div
                  style={{
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 24px",
                  }}
                >
                  <BankOutlined style={{ fontSize: 20, color: "#1890ff", marginRight: 8 }} />
                  <Title level={5} style={{ color: "#fff", margin: 0 }}>
                    Data Bridge
                  </Title>
                </div>
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={[getSelectedKey()]}
                >
                  <Menu.Item key="overview" icon={<PieChartOutlined />}>
                    <Link href="/overview">系统概览</Link>
                  </Menu.Item>
                  <Menu.Item key="tenants" icon={<TeamOutlined />}>
                    <Link href="/tenants">租户管理</Link>
                  </Menu.Item>
                  <Menu.Item key="tasks" icon={<UnorderedListOutlined />}>
                    <Link href="/tasks">任务列表</Link>
                  </Menu.Item>
                </Menu>
              </Sider>

              <Layout style={{ marginLeft: 200 }}>
                <Content style={{ padding: "24px", minHeight: 280 }}>
                  {children}
                </Content>
                <Footer style={{ textAlign: "center", color: "#ccc" }}>
                  School Data Bridge Console ©{new Date().getFullYear()}
                </Footer>
              </Layout>
            </Layout>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
