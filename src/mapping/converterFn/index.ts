export const converters: Record<string, (value: any, config: any) => any> = {
  default: (value) => value,
  genderConverter: (value, config) => config[value] || 'unknown',
  dateConverter: (value) => (value ? new Date(value).toISOString() : null),
  // 🔧 新增：如果值为空（null/undefined/空字符串），则返回 undefined，Pipeline 会自动剔除该 Key
  ignoreEmpty: (value) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return undefined;
    }
    return value;
  },
};

