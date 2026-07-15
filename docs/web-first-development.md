# Web-first development

Workflow Studio now uses one renderer client contract in both environments:

```text
React renderer
  ├─ Browser development -> local HTTP API -> WorkflowStudioService
  └─ Windows Electron    -> preload IPC    -> WorkflowStudioService
```

The browser never accesses the filesystem or Orca CLI directly. The local API is a development companion and remains bound to `127.0.0.1`; it provides the same project, workflow, configuration, preview, and run operations as Electron IPC.

## WSL browser development

Use two WSL terminals from the repository root.

```bash
# Terminal 1: the local-only filesystem/Orca API
npm --workspace @orca/workflow-studio run web:server

# Terminal 2: the React/Vite renderer
npm --workspace @orca/workflow-studio run dev
```

Open `http://localhost:5173` in a Windows browser. Enter the **WSL absolute path** of a Git project in the header, for example `/home/me/projects/example`, then choose **Open path**. The browser connects through Vite's `/api` proxy, so it never needs a WSL filesystem mount or direct CLI access.

The API accepts projects only below its permitted root. It defaults to this repository root. To develop with a different parent directory, set it explicitly before starting the API:

```bash
WORKFLOW_STUDIO_PROJECT_ROOT=/home/me/projects \
  npm --workspace @orca/workflow-studio run web:server
```

Do not bind this API to a LAN address or expose it through a tunnel: it can read and write local Git projects and can invoke the local Orca runner when that action is requested.

## Windows desktop verification

Use a separate Windows checkout and Windows Node/npm for the actual Electron surface:

```powershell
npm install
npm run build
npm --workspace @orca/workflow-studio start
```

Do not share `node_modules` between a WSL checkout and a Windows checkout. The same React UI runs in both modes, but browser mode uses Linux/WSL paths while the Windows Electron process uses Windows paths.
