# PuuNote Plugin API Documentation

Welcome to the PuuNote Plugin Developer Guide. This document provides everything you need to know to write a plugin for the application.

## Overview
Plugins in PuuNote are objects implementing the `PluginDefinition` interface. They are registered dynamically during app initialization. 

A plugin can:
- Execute logic on initialization (`init`) or teardown (`unload`).
- Register custom Commands for the Command Palette (`commands`).
- Register context actions on Cards (`cardActions`).
- Provide an inline Settings UI in the Plugins Panel (`settingsComponent`).
- Hook into node lifecycle events (`hooks.onNodeCreated`, `hooks.onNodeUpdated`, `hooks.onNodeDeleted`).
- Provide long-running background tasks via the **Job Panel**.
- Integrate with API Keys from `.env` (locally/hosting) or local storage (through the UI).
- Read and modify the Document Tree (the application's data structure).

---

## 1. Plugin Structure

Each plugin should reside in its own separate directory inside `src/plugins/`. This avoids cluttering and keeps related files (like prompts, UI dialogs, and utilities) together.

Example structure:
```
src/plugins/
  registry.ts
  init.ts
  index.ts                     ← Central barrel exporting active plugins
  my-awesome-plugin/           ← Directory for your plugin
    manifest.ts                ← id, name, version, description
    index.tsx                  ← main export plugin logic (PluginDefinition)
    utils.ts                   ← utility functions
    YourCustomModal.tsx        ← UI component (if needed)
```

### 1.1 The Manifest (`manifest.ts`)

```typescript
export const myPluginManifest = {
  id: "my-unique-plugin-id",
  name: "My Awesome Plugin",
  version: "1.0.0",
  description: "Demonstrates how to build a basic plugin."
};
```

### 1.2 Main Plugin File (`index.tsx`)

```tsx
import type { PluginDefinition, PluginAPI } from "../../registry";
// Best Practice: Use lucide-react for all your plugin icons to match the app's standard icon library.
import { Sparkles, Replace, FileUp } from "lucide-react";
import { myPluginManifest } from "./manifest";

let pluginApi: PluginAPI | null = null;

// Optional: A React component to render in the user's Plugin Settings tab
function MyPluginSettings() {
  return <div className="p-4 text-white">My settings UI here</div>;
}

export const myAwesomePlugin: PluginDefinition = {
  ...myPluginManifest,
  settingsComponent: MyPluginSettings,

  async init(api: PluginAPI) {
    pluginApi = api;
    console.log("Plugin initialized!");
  },
  
  async unload() {
    console.log("Plugin unloaded!");
  },

  commands: [
    {
      id: "my-plugin-command",
      label: "Run My Plugin Action",
      // CRITICAL DIFFERENCE: Commands require a ComponentType reference, NOT a React instance.
      // Pass the Lucide component directly without JSX brackets:
      icon: Sparkles, 
      execute: async () => {
        // Command action logic here
      }
    }
  ],

  cardActions: [
    {
      id: "my-card-action",
      label: "Process Card",
      icon: Replace, // Use the ComponentType here, like in commands
      isVisible: (nodeId: string) => true,
      onClick: (nodeId: string) => {
        // Context action logic here
      }
    }
  ],

  headerActions: [
    {
      id: "my-header-action",
      label: "Smart Import",
      icon: FileUp,   // Requires ComponentType just like commands
      dropdownItems: [
        {
          id: "import-pdf",
          label: "Import from PDF",
          icon: FileUp, 
          onClick: () => { console.log("Importing..."); }
        }
      ]
    }
  ],

  footerActions: [
    {
      id: "my-footer-action",
      label: "Status check",
      icon: Sparkles, // Requires ComponentType
      onClick: () => { console.log("Checking status..."); }
    }
  ],

  hooks: {
    // Intercept content changes before they are saved to the store (e.g. for typography or smart quotes)
    onBeforeContentChange: (nodeId, newContent) => {
      // Return a modified string if you want to alter the content, or nothing.
      return newContent.replace(/---/g, "—").replace(/--/g, "–");
    },
    onNodeCreated: (node) => {
      console.log("New node added: ", node.id);
    }
  }
};
```

**Installation**: Because of `import.meta.glob` in `src/plugins/index.ts`, your plugin is **automatically discovered and registered** as long as you export a `PluginDefinition` object with a unique `id` and `name` from an `index.ts` or `index.tsx` file in your plugin's directory. No manual registration is required.

### 1.3 Dynamic Actions (Card, Header, Footer)
If your plugin provides dynamic actions (`cardActions`, `headerActions`, or `footerActions`) generated from settings, define them as mutable array references in your plugin definition. When changing their contents (e.g., `cardActionsList.push(...)`), dispatch a global event to notify the host UI to recount the actions:
```typescript
window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
```

---

## 2. Testing Constraints

Since plugins are loaded quickly inside the local preview:
- You do NOT need to modify the main application compilation outside of `src/plugins/index.ts`
- Avoid directly mutating the `nodes` raw array in Zustand unless using standard `useAppStore` mutations (e.g. `setNodes`).

### Node Structure (`PuuNode`)

```typescript
export interface PuuNode {
  id: string; // Unique UUID
  parentId: string | null; 
  content: string; // Markdown text of the node
  createdAt: number;
  updatedAt: number;
  width?: number;
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}
```

---

## 3. The `PluginAPI`

The `api` object provided to `init(api)` contains the primary interface to the app.

```typescript
export interface PluginAPI {
  // 1. Get the current AppStore state (Redux/Zustand pattern)
  getState: () => AppStore; 
  
  // 2. Job Panel: Run background tasks and display their progress
  addJob: (title: string) => string; // Returns the Job ID
  updateJobProgress: (id: string, progress: number, statusText?: string) => void;
  completeJob: (id: string, resultLabel: string, onClick?: () => void) => void;
  failJob: (id: string, error: string) => void;
  
  // 3. UI Toasts
  toast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;

  // 4. Editor Interaction (Selection & Cursor)
  editor?: {
    // Get the exact text highlighted by the user, plus offsets
    getActiveSelection: () => { nodeId: string; start: number; end: number; text: string } | null;
    // Insert string where the cursor is currently blinking
    insertTextAtCursor: (text: string) => void;
    // Replace the currently highlighted text with new text
    replaceSelection: (text: string) => void;
  };

  // 5. Settings Storage
  settings?: {
    get: (key: string, defaultValue?: any) => any;
    set: (key: string, value: any) => void;
    // Safely retrieves global settings stored by the host app
    getGlobal: (key: 'geminiApiKey' | string) => any; 
  };
  
  // 6. Document Operations & Context
  document?: {
    // Basic Node CRUD
    addNode: (content: string, parentId?: string | null) => string;
    deleteNode: (id: string) => void;
    getNode: (id: string) => PuuNode | null;
    updateNodeContent: (id: string, content: string) => void;
    
    // Metadata Injection
    getActiveNodeId?: () => string | null;
    setNodeMetadata?: (id: string, key: string, value: any) => void;
    getNodeMetadata?: (id: string, key: string) => any;
    
    // Context Resolver (Generates text from scope for LLM prompts)
    resolveContext?: (id: string, scope: "card" | "document" | "level_branch" | "level_all" | "branch_parent" | "branch_children" | string) => string;
    batchUpdate?: (updates: {id: string, content?: string, metadata?: Record<string,any>}[]) => void;
    // Attachments
    addAttachment?: (id: string, file: File | {name: string, type: string, url: string}) => void;
    getAttachments?: (id: string) => {id: string; name: string; type: string; url: string}[];
    removeAttachment?: (nodeId: string, attachmentId: string) => void;
  };
  
  // 7. Core AI Language Model access
  llm?: {
    // Uses the host app's LLM fallback cascade and API keys automatically
    generateText: (prompt: string, options?: any) => Promise<{text: string, usedModel: string}>;
    generateTextStream?: (prompt: string, options?: any, onChunk?: (chunk: string) => void) => Promise<{text: string, usedModel: string}>;
  };
  
  // 8. Custom UI & Overlays
  ui?: {
    // Mounts an isolated React component into the Host app's managed portal overlay layer
    renderOverlay: (id: string, Component: React.ComponentType<any>, position?: any) => void;
    closeOverlay: (id: string) => void;
    // Inject Custom Components strictly into cards:
    registerCardWidget?: (widgetId: string, Component: React.ComponentType<{node: PuuNode}>, position?: "top" | "bottom" | "replace") => void;
  };
}
```

## 4. Understanding Context Scopes

When a user triggers an AI prompt or requests an analysis, they often want context beyond just a single card. `api.document.resolveContext(id, scope)` dynamically fetches text data based on a strict terminology dictionary.

*   `"card"`: Only the text of the given node.
*   `"document"`: The entire tree structure concatenated.
*   `"level_branch"`: The siblings of this node (nodes with the same parent).
*   `"level_all"`: All nodes at the exact same depth across the entire document.
*   `"branch_parent"`: The vertical tree structure leading from the root down to this node (Ancestors + Self).
*   `"branch_children"`: This node and all its descending children down to the leaf levels.
*   `"branch_1"`, `"branch_2"`: This node plus X generations of children.
*   `"branch_-1"`, `"branch_-2"`: This node plus X generations of parents upwards.

```typescript
const contextString = api.document?.resolveContext(nodeId, "branch");
const prompt = `Based on this branch history:\n\n${contextString}\n\nWhat should the next point be?`;
const response = await api.llm?.generateText(prompt);
```

## 5. Integrating Metadata & UI Widgets

Plugins can permanently attach invisible data to nodes and render them locally.

```typescript
// Add custom metadata (stored safely in node.metadata without corrupting JSON shape)
api.document?.setNodeMetadata(nodeId, "myPluginStatus", "verified");

// Render a widget dynamically before the text input of cards 
api.ui?.registerCardWidget('status-widget', (props) => {
    const status = props.node.metadata?.myPluginStatus;
    if (!status) return null;
    return <div className="text-xs text-green-500">Verified Note</div>;
}, "top");
```

### 3.1 Editor Interaction (Cursor & Selection)
When writing plugins that interact with text (especially AI-assistants that rewrite sentences or fix typos), you need access to the user's cursor selection. The `api.editor` namespace abstracts away the core editor logic:

```typescript
const selection = api.editor?.getActiveSelection();
if (selection && selection.text) {
  const fixedText = await aiFixSpelling(selection.text);
  api.editor?.replaceSelection(fixedText);
}
```

### 3.2 Manipulating the Tree (via Document API)

The easiest way to read or manipulate nodes is via the `api.document` interface, which abstracts the internal data stores:

```typescript
// 1. Read an existing node
const node = api.document?.getNode("some-id");

// 2. Change Node content
api.document?.updateNodeContent("some-id", "New Content #tags");

// 3. Add a new node (as a child or at root)
const newId = api.document?.addNode("My New Note", "parent-id");
```

_(Note: You can still bypass this and use the global `api.getState().addChild()` when needed.)_

### 3.2 Using the Job Panel

If you have a multi-step operation (like parsing or calling AI multiple times), you should report progress:

```typescript
try {
  const jobId = api.addJob("Structuring Document...");
  
  api.updateJobProgress(jobId, 10, "Extracting themes...");
  await doWork();

  api.updateJobProgress(jobId, 100, "Done");
  api.completeJob(jobId, "View Results", () => {
     console.log("User investigated results");
  });
} catch(err) {
  api.failJob(jobId, String(err));
}
```

### 3.4 Accessing Environment Variables & Settings

To handle plugin-specific settings safely, use the `api.settings` namespace. For global variables securely managed by the Host app (like `geminiApiKey`), you've got `api.settings?.getGlobal("geminiApiKey")`. This removes the need for unsafe `localStorage` sniffing across origins/sandboxes.

```typescript
// Save a setting
api.settings?.set('language', 'fr');

// Retrieve a plugin setting with a fallback
const lang = api.settings?.get('language', 'en');

// Get the user's master Gemini API key safely
const aiKey = api.settings?.getGlobal('geminiApiKey');
```

Alternatively, you should NOT ping Gemini raw, but use the `api.llm` standard object which handles keys & model fallbacks automatically:

```typescript
const { text, usedModel } = await api.llm?.generateText("Explain this note") || {};
```

### 3.5 Spawning Custom Modal UIs

If your plugin provides complex visualizations or popup dialogues that must float above the whole app (like an Audio Recorder widget), append it to the core system portal via `ui`:

```tsx
import { MicRecorder } from "./MicRecorder";

// Mount a widget dynamically
api.ui?.renderOverlay("voice-recorder", MicRecorder, { top: "20px", right: "20px" });

// Dismount
api.ui?.closeOverlay("voice-recorder");
```

### 3.5 Import and Export Customization

Currently, the Plugin API does not natively inject custom formats into the core "File > Import" or "File > Export" dropdowns. However, if your plugin offers custom import or extended export formats (e.g., PDF export, CSV import), you can provide this functionality by:
1. Registering an entry in the `commands` array (which appears in the Command Palette).
2. Tying that command to a custom UI modal or native browser file picker.
3. Once the file is processed by your plugin, using `api.getState().setNodes()` to update the document tree structure.

---

## 4. Design & Styling Guidelines (CRITICAL)

Pluggable UIs MUST seamlessly blend into the application without asserting hardcoded designs. The app uses **Tailwind CSS**.

- **DO NOT** use absolute layout colors (e.g., `bg-white`, `bg-black`, `text-black` or fixed Hex codes) inside plugin menus, modales, or inputs. In dark mode, hardcoded `bg-white` or `bg-black` causes unusable or illegible UI elements.
- **DO USE** application semantic CSS variables / Tailwind custom classes:
  - Backgrounds: `bg-app-bg` (main background), `bg-app-card` (modals and panels), `bg-app-panel` (header/toolbar bounds).
  - Text: `text-app-text-primary` (main text), `text-app-text-secondary` (subtext), `text-app-text-muted` (hints or small text).
  - Borders: `border-app-border` (separators, input outlines).
  - Inputs & Textareas: `bg-app-input-bg` for form fields. Do not use standard white or black inputs. Always combine `bg-app-input-bg border border-app-border text-app-text-primary focus:ring-1 focus:ring-app-accent`.

Example form field in a plugin settings component:
```tsx
<input 
  className="w-full bg-app-input-bg border border-app-border rounded px-3 py-2 text-sm text-app-text-primary"
  placeholder="API Key..."
/>
```

---

## 5. Working with AI / LLM APIs

If your plugin needs to parse text using Gemini, DO NOT initialize `GoogleGenAI` manually. Instead, leverage the application's fallback chain, ensuring you respect rate limits, user settings, and fallback logic:

**DO:** Use the `generateContentFallback` helper.
```typescript
import { generateContentFallback } from "../../utils/aiModels";

const summarizeText = async (text: string) => {
  // Respects models chosen by the user in global settings
  // The Sandbox will mock this function to help you test UI without burning real tokens
  const response = await generateContentFallback(`Summarize: ${text}`);
  console.log(`Generated by model: ${response.usedModel}`);
  return response.text;
};
```

**DON'T:** Use custom clients within plugins unless interfacing with a completely different service architecture not supported by the core app.

