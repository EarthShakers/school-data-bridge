export const teacherMockData = [
  { ID: "T001", XM: "张三", GH: "1001", ORG_IDS: ["dept1"], XB: "1" },
  { ID: "T002", XM: "李四", GH: "1002", ORG_IDS: ["dept1"], XB: "0" },
  { ID: "T003", XM: "王五", GH: "1003", ORG_IDS: ["dept2"], XB: "1" },
  { ID: "T004", XM: "无效性别", GH: "1004", ORG_IDS: ["dept2"], XB: "9" },
  { ID: "T005", GH: "1005", ORG_IDS: ["dept1"], XB: "1" }, // 缺失 XM (name)，将被过滤
];
