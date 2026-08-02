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
        // BACKEND_URL is preferred because the browser only calls the same-origin
        // /api/backend path. Keep NEXT_PUBLIC_BACKEND_URL as a compatibility
        // fallback for the existing Docker/DigitalOcean deployment.
        const backendUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;

        if (!backendUrl) {
            if (process.env.VERCEL === "1") {
                throw new Error("BACKEND_URL must be configured for Vercel deployments.");
            }
            return [];
        }

        let parsedBackendUrl: URL;
        try {
            parsedBackendUrl = new URL(backendUrl);
        } catch {
            throw new Error("BACKEND_URL must be an absolute HTTP(S) URL.");
        }

        if (!["http:", "https:"].includes(parsedBackendUrl.protocol)) {
            throw new Error("BACKEND_URL must use HTTP or HTTPS.");
        }
        if (parsedBackendUrl.search || parsedBackendUrl.hash) {
            throw new Error("BACKEND_URL must not contain a query string or fragment.");
        }
        if (process.env.VERCEL === "1" && parsedBackendUrl.protocol !== "https:") {
            throw new Error("BACKEND_URL must use HTTPS on Vercel.");
        }

        const normalizedBackendUrl = parsedBackendUrl.toString().replace(/\/$/, "");
        return [
            {
                source: "/api/backend/:path*",
                destination: `${normalizedBackendUrl}/:path*`,
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
