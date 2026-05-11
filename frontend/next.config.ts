import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    // บอกให้ Turbopack รู้ว่า root ของงานอยู่ที่โฟลเดอร์ ECTI_2026
    turbopack: {
        root: path.resolve(process.cwd(), ".."),
    },
    webpack: (config) => {
        if (!config.resolve) {
            config.resolve = {};
        }
        if (!config.resolve.alias) {
            config.resolve.alias = {};
        }
        config.resolve.alias.canvas = false;
        config.resolve.alias.encoding = false;

        if (!config.resolve.fallback) {
            config.resolve.fallback = {};
        }
        config.resolve.fallback.canvas = false;
        config.resolve.fallback.encoding = false;

        return config;
    },
    serverExternalPackages: ["pdfjs-dist"],

    async rewrites() {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl || !backendUrl.startsWith('http')) {
            return [];
        }
        return [
            {
                source: "/api/backend/:path*",
                destination: `${backendUrl}/:path*`,
            },
        ];
    },

    async redirects() {
        return [
            {
                source: "/",
                destination: "/create",
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
