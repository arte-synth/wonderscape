import esbuild from "esbuild";
import * as Vite from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";
import packageJSON from "./package.json" assert { type: "json" };

const config = Vite.defineConfig(({mode }): Vite.UserConfig => {
    const buildMode = mode === "production" ? "production" : "development";
    const outDir = "dist";

    const plugins = [tsconfigPaths()];
    // Handle minification after build to allow for tree-shaking and whitespace minification
    // "Note the build.minify option does not minify whitespaces when using the 'es' format in lib mode, as it removes
    // pure annotations and breaks tree-shaking."
    if (buildMode === "production") {
        plugins.push(
            {
                name: "minify",
                renderChunk: {
                    order: "post",
                    async handler(code, chunk) {
                        return chunk.fileName.endsWith(".mjs")
                            ? esbuild.transform(code, {
                                keepNames: true,
                                minifyIdentifiers: false,
                                minifySyntax: true,
                                minifyWhitespace: true,
                            })
                            : code;
                    },
                },
            },
            ...viteStaticCopy({
                targets: [
                    { src: "README.md", dest: "." },
                ],
            }),
        );
    }

    return {
        base: "./",
        publicDir: "static",
        define: {
            BUILD_MODE: JSON.stringify(buildMode),
        },
        esbuild: { keepNames: true },
        build: {
            outDir,
            emptyOutDir: false, // fails if world is running due to compendium locks. We do it in "npm run clean" instead.
            minify: false,
            sourcemap: buildMode === "development",
            lib: {
                name: "wonderscape",
                entry: "src/wonderscape.mjs",
                formats: ["es"],
                fileName: "wonderscape"
            },
            rollupOptions: {
                output: {
                    assetFileNames: "styles/[name].[ext]",
                    chunkFileNames: "[name].mjs",
                    entryFileNames: "wonderscape.mjs",
                    manualChunks: {
                        vendor: buildMode === "production" ? Object.keys(packageJSON.dependencies) : [],
                    },
                },
                watch: { buildDelay: 100 },
            },
            target: "es2022",
        },
        plugins: plugins.filter(p => p.name !== "vite:copy"),
        css: {
            devSourcemap: buildMode === "development",
        },
    };
});

export default config;