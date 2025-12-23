/** @type {import('next').NextConfig} */
const nextConfig = {
    // This is the crucial change to prevent bcryptjs, a server-side only package,
    // from being bundled into the Edge-runtime middleware.
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Exclude bcrypt from client-side bundle
            config.externals.push('bcryptjs');
        }
        // Suppress critical dependency warnings for @opentelemetry instrumentation
        config.ignoreWarnings = [
            { module: /@opentelemetry\/instrumentation/ },
            { module: /require-in-the-middle/ },
            { module: /handlebars/ },
        ];
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
  // Fix Bug #8: Enable strict build checks for production
  typescript: {
    // Only ignore build errors in development, not production
    ignoreBuildErrors: process.env.NODE_ENV !== 'production'
  },
  // Fix Bug #8: Enable ESLint for production builds
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production'
  },
    // Configure Next.js for production
    productionBrowserSourceMaps: false,
    // Disable automatic static optimization for better control
    staticPageGenerationTimeout: 60,
    // Enable standalone output for Docker deployment
    output: 'standalone'
};

export default nextConfig;
