/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async rewrites() {
    return [
      { source: '/firebase-messaging-sw.js', destination: '/api/firebase-messaging-sw' },
    ];
  },
}

module.exports = nextConfig
