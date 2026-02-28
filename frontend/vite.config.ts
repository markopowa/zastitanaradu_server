import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        target: "es2020",
        minify: "esbuild",
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    "vendor-react": ["react", "react-dom", "react-router-dom"],
                    "vendor-mui": [
                        "@mui/material",
                        "@mui/icons-material",
                        "@emotion/react",
                        "@emotion/styled",
                    ],
                    "vendor-redux": ["react-redux", "@reduxjs/toolkit"],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
    server: {
        // host: "192.168.1.8",
        port: 5173,
    },
    preview: {
        port: 5173,
    },
});
