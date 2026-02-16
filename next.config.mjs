/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Externalize heavy packages
        config.externals = config.externals || [];
        if (!isServer) {
            config.externals.push({
                'bcryptjs': 'bcryptjs',
                'crypto': 'crypto'
            });
        }

        // Ignore warnings to reduce build noise
        config.ignoreWarnings = [
            { module: /@opentelemetry\/instrumentation/ },
            { module: /require-in-the-middle/ },
            { module: /handlebars/ },
            { module: /bcryptjs/ },
            { module: /prisma/ },
        ];

        return config;
    },
    // Optimize for production builds
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'ioredis', 'bullmq'],
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
        // Disable expensive features
        typedRoutes: false,
        serverActions: true,
    },
    output: 'standalone',
    reactStrictMode: true,
    
    // Optimize images - reduce processing
    images: {
        domains: ['cdn.sanity.io', 'res.cloudinary.com', 'images.unsplash.com'],
        formats: ['image/webp'], // Only WebP to reduce build time
        deviceSizes: [640, 828], // Fewer sizes
        imageSizes: [16, 32, 48], // Fewer sizes
        minimumCacheTTL: 60,
        unoptimized: false, // Keep optimization but with fewer sizes
    },
    
    // Disable expensive features for builds
    typescript: {
        ignoreBuildErrors: true
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    
    // Reduce build overhead
    productionBrowserSourceMaps: false,
    swcMinify: true,
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
    trailingSlash: false,
    
    // Optimize build caching
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
};

export default nextConfig;
