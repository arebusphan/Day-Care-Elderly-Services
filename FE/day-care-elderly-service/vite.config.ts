import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: [
            { find: /^@base-ui\/react\/dialog$/, replacement: path.resolve(__dirname, "./@/lib/base-ui/dialog.tsx") },
            { find: /^@base-ui\/react\/button$/, replacement: path.resolve(__dirname, "./@/lib/base-ui/button.tsx") },
            { find: /^@base-ui\/react\/input$/, replacement: path.resolve(__dirname, "./@/lib/base-ui/input.tsx") },
            { find: /^@base-ui\/react\/merge-props$/, replacement: path.resolve(__dirname, "./@/lib/base-ui/merge-props.ts") },
            { find: /^@base-ui\/react\/use-render$/, replacement: path.resolve(__dirname, "./@/lib/base-ui/use-render.tsx") },
            { find: "class-variance-authority", replacement: path.resolve(__dirname, "./@/lib/cva.ts") },
            { find: "@/components", replacement: path.resolve(__dirname, "./@/components") },
            { find: "@/hooks", replacement: path.resolve(__dirname, "./@/hooks") },
            { find: "@", replacement: path.resolve(__dirname, "./src") },
        ],
    },
});