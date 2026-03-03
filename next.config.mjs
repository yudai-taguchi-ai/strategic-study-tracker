/** @type {import('next').NextConfig} */
const nextConfig = {
    images: { unoptimized: true },
    trailingSlash: false,
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
};

export default nextConfig;
