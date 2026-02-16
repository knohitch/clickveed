/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.externals.push({
                'bcryptjs': 'bcryptjs',
                'crypto': 'crypto'
            });
        }

        config.externals.push({
            '@prisma/client': '@prisma/client',
        });

        config.ignoreWarnings = [
            { module: /@opentelemetry\/instrumentation/ },
            { module: /require-in-the-middle/ },
            { module: /handlebars/ },
            { module: /bcryptjs/ },
            { module: /prisma/ },
            { module: /@prisma\/client/ },
        ];

        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'ioredis', 'bullmq'],
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', '@radix-ui/react-dialog'],
        typedRoutes: false,
    },
    output: 'standalone',
    reactStrictMode: true,
    images: {
        domains: ['cdn.sanity.io', 'res.cloudinary.com', 'images.unsplash.com'],
        formats: ['image/webp'],
        deviceSizes: [640, 828],
        imageSizes: [16, 32, 48],
        minimumCacheTTL: 60,
    },
    typescript: {
        ignoreBuildErrors: true
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    productionBrowserSourceMaps: false,
    swcMinify: true,
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
    trailingSlash: false,
};

export default nextConfig;
