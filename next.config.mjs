/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["antd", "@ant-design/icons", "bullmq"],
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
      'pg-query-stream': 'commonjs pg-query-stream',
      tedious: 'commonjs tedious',
      oracledb: 'commonjs oracledb',
      mysql: 'commonjs mysql',
      mysql2: 'commonjs mysql2',
      pg: 'commonjs pg',
      'sqlite3': 'commonjs sqlite3',
    });
    return config;
  },
};

export default nextConfig;

