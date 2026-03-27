/** @type {import('next').NextConfig} */
const nextConfig = {
    images: { unoptimized: true },
    trailingSlash: false,
    experimental: {
        serverActions: {
            bodySizeLimit: '4gb',
        },
    },
};

export default nextConfig;
