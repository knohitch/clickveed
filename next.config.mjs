/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.externals.push({
                'bcryptjs': 'bcryptjs',
                'crypto': 'crypto'
            });
        }

        config.ignoreWarnings = [
            { module: /@opentelemetry\/instrumentation/ },
            { module: /require-in-the-middle/ },
            { module: /handlebars/ },
            { module: /bcryptjs/ },
            { module: /prisma/ },
        ];

        config.optimization = {
            ...config.optimization,
            minimize: true,
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    default: false,
                    vendors: false,
                    commons: {
                        name: 'commons',
                        chunks: 'all',
                        minChunks: 2,
                    },
                },
            },
        };

        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client'],
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    },
    output: 'standalone',
    reactStrictMode: true,
    images: {
        domains: ['cdn.sanity.io', 'res.cloudinary.com', 'images.unsplash.com'],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96],
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
};

export default nextConfig;
