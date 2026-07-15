import { createLocalApiServer } from "./local-api";

const port = Number(process.env.WORKFLOW_STUDIO_API_PORT ?? 4317);
const host = process.env.WORKFLOW_STUDIO_API_HOST ?? "127.0.0.1";

createLocalApiServer().listen(port, host, () => console.log(`Workflow Studio local API listening on http://${host}:${port}`));
