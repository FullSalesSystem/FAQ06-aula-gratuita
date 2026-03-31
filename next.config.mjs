

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
