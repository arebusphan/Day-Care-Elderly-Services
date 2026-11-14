import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: [
            { find: "@/components", replacement: path.resolve(__dirname, "./@/components") },
            { find: "@/hooks", replacement: path.resolve(__dirname, "./@/hooks") },
            { find: "@", replacement: path.resolve(__dirname, "./src") },
        ],
    },
});