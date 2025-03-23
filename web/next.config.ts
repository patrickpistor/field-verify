/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001', 'field-verify-l6h5umnaw-patrick-pistors-projects.vercel.app'],
    },
  },
}

module.exports = nextConfig