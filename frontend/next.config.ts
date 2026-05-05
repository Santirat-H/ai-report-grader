import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
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
