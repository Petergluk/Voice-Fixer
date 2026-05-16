# PuuNote Plugin Sandbox


This directory contains a standalone sandbox environment designed specifically to help AI coding assistants (like Cursor, Claude, ChatGPT, etc.) write and test plugins for PuuNote.

## Why this Sandbox exists?

PuuNote is a complex React application with its own state management, tree structures, and API constraints. When you are writing a new plugin using an AI model, providing the full original codebase might be overwhelming or unnecessary. 

Instead, this sandbox provides:
1. **A mock `pluginApi.ts`**: Simulating the plugin registration and behavior inside the main app.
2. **A clean `App.tsx` container**: Rendering a UI layout identical to the main app specifically to render the test plugin components, actions, header buttons, and UI overlays.
3. **Copy of core documentation**: The `AGENTS.md` and `docs/PLUGIN_API.md` files are placed here so the AI knows all constraints, API models, and data structures.

## How to use

1. Give the AI context to this folder (e.g., add `/plugin-sandbox` to context in Cursor or ZIP the folder).
2. Prompt the AI: *"Create a new PuuNote plugin [name] in the `src/plugins/` directory of this sandbox. Follow the API from `docs/PLUGIN_API.md` and use `utils/aiModels.ts` to access AI if needed."*
3. The AI will write the plugin inside `plugin-sandbox/src/plugins/your-plugin/`.
4. You can run the sandbox independently using:
   ```bash
   npm install
   npm run dev
   ```
5. Once your plugin behaves as expected in the UI dummy elements shown in the sandbox, simply copy the `your-plugin` directory over to `src/plugins/` in the main PuuNote repository.

## Sandbox Structure

- `/src/App.tsx` - Emulates the main application UI, showing Header, Main Space (Card), and Footer where hooks and plugin actions register automatically.
- `/src/plugins/registry.ts` - The mock Plugin API. Exposes the types and registry dummy methods similar to what the main app uses.
- `/src/utils/aiModels.ts` - A mocked utility replicating the AI module detailed in `AGENTS.md` for proper model-agnostic text generative capabilities within your plugins.
- `/docs/PLUGIN_API.md` - Complete reference of the Plugin implementation interface.
- `/AGENTS.md` - Documentation detailing AI and component styles conventions.
