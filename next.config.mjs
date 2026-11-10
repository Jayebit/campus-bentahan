/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output for standalone builds
  output: "standalone",

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_UNIVERSITY_DOMAIN: process.env.NEXT_PUBLIC_UNIVERSITY_DOMAIN,
  },

  // React strict mode
  reactStrictMode: true,

  // Experimental features for App Router
  experimental: {
    // Enable serverActions for form submissions
    serverActions: {
      enabled: true,
    },
  },
};

export default nextConfig;