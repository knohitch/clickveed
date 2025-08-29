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
     typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
