"use client";

import React, { useEffect, useState } from "react";
import { TaskList } from "../components/TaskList";
import { message } from "antd";

export default function TasksPage() {
  const [taskData, setTaskData] = useState<{ counts: any; jobs: any[] }>({
    counts: {},
    jobs: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.error) {
        message.error(`获取任务队列失败: ${data.error}`);
        // 保持原有结构，避免组件崩溃
        setTaskData((prev) => ({ ...prev }));
      } else {
        setTaskData(data);
      }
    } catch (err) {
      message.error("获取任务队列失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 30000); // 延长至 30 秒自动刷新
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: "bold" }}>任务队列</h2>
      </div>
      <TaskList taskData={taskData} loading={loading} onRefresh={fetchTasks} />
    </div>
  );
}
