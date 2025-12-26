export const converters: Record<string, (value: any, config: any) => any> = {
  default: (value) => value,
  genderConverter: (value, config) => config[value] || 'unknown',
  dateConverter: (value) => value ? new Date(value).toISOString() : null,
  // Add more converters as needed
};

