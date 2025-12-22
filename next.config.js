/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // API configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Shopify-Hmac-Sha256' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
