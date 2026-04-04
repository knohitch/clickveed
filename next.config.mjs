/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    
    // Optimize images - reduce processing
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
        formats: ['image/webp'], // Only WebP to reduce build time
        deviceSizes: [640, 828], // Fewer sizes
        imageSizes: [16, 32, 48], // Fewer sizes
        minimumCacheTTL: 60,
        unoptimized: false, // Keep optimization but with fewer sizes
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
    
    // Aggressive memory optimizations for 8GB VPS
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'ioredis', 'bullmq'],
        swcPlugins: [],
        swcTraceProfiling: false,
        workerThreads: false, // Disable worker threads
        cpus: 1, // Use only 1 CPU core
    },
    
    // Disable source maps and optimize webpack
    webpack: (config, { isServer, dev }) => {
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
        
        // Disable source maps to reduce memory
        config.devtool = false;
        
        // Reduce parallelism for lower memory usage
        config.optimization = {
            ...config.optimization,
            minimize: true,
            minimizer: config.optimization.minimizer.map((plugin) => {
                if (plugin.constructor.name === 'TerserPlugin') {
                    plugin.options.parallel = 1; // Use only 1 thread for minification
                }
                return plugin;
            }),
        };
        
        // Reduce cache size
        config.cache = {
            type: 'memory',
            maxGenerations: 1,
        };
        
        return config;
    },
};

export default nextConfig;
