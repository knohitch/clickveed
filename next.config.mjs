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

        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client'],
    },
    output: 'standalone',
    reactStrictMode: true,
    images: {
        domains: ['cdn.sanity.io', 'res.cloudinary.com', 'images.unsplash.com']
    },
    typescript: {
        ignoreBuildErrors: true
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    productionBrowserSourceMaps: false,
};

export default nextConfig;
