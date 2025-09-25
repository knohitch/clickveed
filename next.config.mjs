/** @type {import('next').NextConfig} */
const nextConfig = {
    // This is the crucial change to prevent bcryptjs, a server-side only package,
    // from being bundled into the Edge-runtime middleware.
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Exclude bcrypt from client-side bundle
            config.externals.push('bcryptjs');
        }
        return config;
    },
    // Production optimizations
    experimental: {
        // Enable React Server Components for better performance
        serverComponentsExternalPackages: ['@prisma/client']
    },
    // Enable strict mode for better error detection
    reactStrictMode: true,
    // Enable production-grade image optimization
    images: {
        domains: ['cdn.sanity.io', 'res.cloudinary.com', 'images.unsplash.com']
    },
    // Configure TypeScript for production
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: process.env.NODE_ENV === 'development'
    },
    // Configure ESLint for production
    eslint: {
        ignoreDuringBuilds: true
    },
    // Configure Next.js for production
    productionBrowserSourceMaps: false,
    // Disable automatic static optimization for better control
    staticPageGenerationTimeout: 60,
    // Enable standalone output for Docker deployment
    output: 'standalone'
};

export default nextConfig;
