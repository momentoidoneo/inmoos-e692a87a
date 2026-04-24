import { createServer } from "vite";
import { createViteConfig } from "./vite-shared.mjs";

const server = await createServer(await createViteConfig({ mode: "development" }));

await server.listen();
server.printUrls();
