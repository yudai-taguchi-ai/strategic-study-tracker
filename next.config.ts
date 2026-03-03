/** @type {import('next').NextConfig} */
const nextConfig = {
    images: { unoptimized: true },
    trailingSlash: false,
    swcMinify: false, // Lightning CSSのエラーを回避するために無効化
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
}

export default nextConfig
