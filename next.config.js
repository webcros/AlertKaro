/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // Redirect all traffic to /maintenance except the maintenance page itself,
        // Next.js static files, and public assets like images and manifest
        source:
          "/((?!maintenance|_next|images|favicon\\.ico|manifest\\.json).*)",
        destination: "/maintenance",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "adsxsdwthxeqawoxipom.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
