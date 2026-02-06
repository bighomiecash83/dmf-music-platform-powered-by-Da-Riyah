/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API rewrites for seamless backend integration
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

    return [
      { source: '/api/health', destination: `${apiUrl}/api/health` },
      { source: '/api/artists', destination: `${apiUrl}/api/artists` },
      { source: '/api/bots/:path*', destination: `${apiUrl}/api/bots/:path*` },
      { source: '/api/revenue/:path*', destination: `${apiUrl}/api/revenue/:path*` },
      { source: '/api/pricing/:path*', destination: `${apiUrl}/api/pricing/:path*` },
      { source: '/api/owner/:path*', destination: `${apiUrl}/api/owner/:path*` },
      { source: '/api/catalog/:path*', destination: `${apiUrl}/api/catalog/:path*` },
    ];
  },

  // Environment variables available to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
};

module.exports = nextConfig;
