import { build } from "vite";
import { createViteConfig } from "./vite-shared.mjs";

const modeArgIndex = process.argv.indexOf("--mode");
const mode = modeArgIndex >= 0 ? process.argv[modeArgIndex + 1] : "production";

await build(await createViteConfig({ mode }));
