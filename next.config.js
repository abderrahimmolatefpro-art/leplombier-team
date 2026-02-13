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
  async headers() {
    return [
      {
        source: '/espace-client/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://leplombier.ma https://www.leplombier.ma",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
