import type { ComponentType, ReactNode } from "react";


export interface PuuNodeMetadata {
  isGenerating?: boolean;
  branchColor?: string;
  ai?: {
    provider?: string;
    jobId?: string;
    generatedAt?: string;
    operation?: string;
  };
  plugin?: unknown;
  [key: string]: unknown;
}

export interface PuuNode {
  id: string;
  content: string;
  parentId: string | null;
  order?: number;
  metadata?: PuuNodeMetadata;
}

export interface PluginHooks {
  onBeforeContentChange?: (nodeId: string, newContent: string) => string | undefined;
  onNodeCreated?: (node: PuuNode) => void;
  onNodeUpdated?: (node: PuuNode) => void;
  onNodeDeleted?: (nodeId: string) => void;
}

export interface CommandHook {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  destructive?: boolean;
  hotkey?: string;
  run?: () => void | Promise<void>; // some legacy might use execute, keep it
  execute?: () => void | Promise<void>;
}

export interface CardActionHook {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }> | ReactNode;
  showOnHover?: boolean;
  isVisible?: (nodeId: string, node: PuuNode) => boolean;
  onClick: (nodeId: string, node: PuuNode) => void;
}

export interface GlobalActionHook {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  dropdownItems?: {
    id: string;
    label: string | ReactNode;
    icon?: ComponentType<{ size?: number; className?: string }>;
    onClick: () => void;
  }[];
}

export interface PluginDefinition {
  id: string;
  name: string;
  version?: string;
  description?: string;
  hooks?: PluginHooks;
  cardActions?: CardActionHook[];
  commands?: CommandHook[];
  headerActions?: GlobalActionHook[];
  footerActions?: GlobalActionHook[];
  settingsComponent?: ComponentType;
  init?: (api: PluginAPI) => void | Promise<void>;
  unload?: () => void | Promise<void>;
}

export interface EditorSelection {
  nodeId: string;
  start: number;
  end: number;
  text: string;
}

export interface PluginAPI {
  plugins?: {
    addCommand: (command: CommandHook) => void;
  };
  events?: {
    on: (eventName: "nodeSelected" | "nodeChanged" | "treeChanged" | "beforeUnload" | "nodeDeleted" | "selectionChanged" | "jobCancelled", callback: (data: any) => void) => void;
    off: (eventName: string, callback: Function) => void;
  };
  document?: {
    addNode: (content: string, parentId?: string | null) => string;
    deleteNode: (id: string) => void;
    getNode?: (id: string) => PuuNode | null;
    updateNodeContent?: (id: string, content: string) => void;
    getActiveNodeId?: () => string | null;
    setNodeMetadata?: <K extends keyof PuuNodeMetadata>(id: string, key: K | string, value: PuuNodeMetadata[K] | any) => void;
    getNodeMetadata?: <K extends keyof PuuNodeMetadata>(id: string, key: K | string) => PuuNodeMetadata[K] | any;
    resolveContext?: (id: string, scope: "card" | "document" | "level_branch" | "level_all" | "branch_parent" | "branch_children" | string) => string;
    batchUpdate?: (updates: {id: string, content?: string, metadata?: Record<string,any>}[]) => void;
    addAttachment?: (id: string, file: File | {name: string, type: string, url: string}) => void;
    getAttachments?: (id: string) => {id: string; name: string; type: string; url: string}[];
    removeAttachment?: (nodeId: string, attachmentId: string) => void;
  };
  editor?: {
    getActiveSelection: () => { nodeId: string; start: number; end: number; text: string } | null;
    insertTextAtCursor: (text: string) => void;
    replaceSelection: (text: string) => void;
  };
  settings?: {
    get: (key: string, defaultValue?: any) => any;
    set: (key: string, value: any) => void;
    getGlobal: (key: string) => any;
  };
  llm?: {
    generateText: (prompt: unknown, options?: any) => Promise<{text: string, usedModel: string}>;
    generateTextStream?: (prompt: unknown, options?: any, onChunk?: (chunk: string) => void) => Promise<{text: string, usedModel: string}>;
  };
  ui?: {
    components?: {
      Button: ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>;
      Input: ComponentType<React.InputHTMLAttributes<HTMLInputElement>>;
    };
    renderOverlay: (id: string, Component: React.ComponentType<any>, position?: any) => void;
    closeOverlay: (id: string) => void;
    renderInlineWidget?: (id: string, Component: React.ComponentType<any>) => void;
    registerCardWidget?: (widgetId: string, Component: React.ComponentType<{node: PuuNode}>, position?: "top" | "bottom" | "replace") => void;
  };
  getState?: () => any;
  addJob?: (title: string) => string;
  updateJobProgress?: (id: string, progress: number, statusText?: string) => void;
  completeJob?: (id: string, resultLabel: string, onClick?: () => void) => void;
  failJob?: (id: string, error: string) => void;
  cancelJob?: (id: string) => void;
  toast?: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}

// Minimal mock Registry 
class MockRegistry {
  plugin: PluginDefinition | null = null;
  api: PluginAPI;
  
  nodes: PuuNode[] = [
    {
      id: "test-node-1",
      parentId: null,
      order: 0,
      content: "Это тестовая карточка для проверки работы плагинов.\n\nВы можете редактировать этот текст как вам удобно, чтобы проверить, как ваш плагин справляется с различными задачами, например:\n- Выполнение перевода текста.\n- Исправление орфографии.\n- Краткий пересказ (суммаризация).\n- Извлечение важных мыслей или ключевых слов.\n- Отправка содержимого в нейросеть.\n\nThe quick brown fox jumps over the lazy dog."
    }
  ];
  listeners: (() => void)[] = [];
  activeSelection: EditorSelection | null = null;

  constructor() {
    this.api = {
      plugins: {
        addCommand: () => {},
      },
      events: {
        on: (e, cb) => {
           window.addEventListener(`sandbox:${e}`, (ev: any) => cb(ev.detail));
        },
        off: () => {}
      },
      document: {
        addNode: (content, parentId) => {
          const newNode: PuuNode = {
            id: "node-" + Date.now(),
            parentId: parentId || null,
            order: this.nodes.filter(n => n.parentId === (parentId || null)).length,
            content
          };
          this.nodes = [...this.nodes, newNode];
          this.notify();
          return newNode.id;
        },
        deleteNode: (id) => {
          this.nodes = this.nodes.filter(n => n.id !== id && n.parentId !== id);
          this.notify();
        },
        getNode: (id) => {
          return this.nodes.find(n => n.id === id) || null;
        },
        updateNodeContent: (id, content) => {
          this.nodes = this.nodes.map(n => n.id === id ? { ...n, content } : n);
          this.notify();
        },
        getActiveNodeId: () => {
          return this.activeSelection?.nodeId || null;
        },
        setNodeMetadata: (id, key, value) => {
          console.log(`Mock setNodeMetadata for ${id}: ${key} =`, value);
          this.nodes = this.nodes.map(n => n.id === id ? { ...n, metadata: { ...n.metadata, [key as string]: value } } : n);
          this.notify();
        },
        getNodeMetadata: (id, key) => {
          const node = this.nodes.find(n => n.id === id);
          return node?.metadata?.[key as string] ?? null;
        },
        resolveContext: (id, scope) => `(Mock context for ${id} with scope ${scope})\nThis is some mock text returned for templating.`,
        batchUpdate: (updates) => {
          updates.forEach(u => {
            if (u.content !== undefined) this.api.document?.updateNodeContent?.(u.id, u.content);
            if (u.metadata !== undefined) {
              Object.entries(u.metadata).forEach(([k, v]) => this.api.document?.setNodeMetadata?.(u.id, k, v));
            }
          });
        },
        addAttachment: (id, file) => {
          console.log(`Mock addAttachment for ${id}`, file);
        },
        getAttachments: (_id) => [],
        removeAttachment: (nodeId, attachmentId) => {
          console.log(`Mock removeAttachment ${attachmentId} from ${nodeId}`);
        }
      },
      editor: {
        getActiveSelection: () => this.activeSelection,
        insertTextAtCursor: (text) => {
          if (!this.activeSelection) return;
          const { nodeId, start, end } = this.activeSelection;
          const node = this.api.document.getNode(nodeId);
          if (node) {
            const before = node.content.substring(0, start);
            const after = node.content.substring(end);
            node.content = before + text + after;
            this.activeSelection = {
              nodeId,
              start: start + text.length,
              end: start + text.length,
              text: ""
            };
            this.notify();
          }
        },
        replaceSelection: (text) => {
          if (!this.activeSelection) return;
          const { nodeId, start, end } = this.activeSelection;
          const node = this.api.document.getNode(nodeId);
          if (node) {
            const before = node.content.substring(0, start);
            const after = node.content.substring(end);
            node.content = before + text + after;
            this.activeSelection = {
              nodeId,
              start,
              end: start + text.length,
              text: text
            };
            this.notify();
          }
        }
      },
      settings: {
        get: (key, def) => {
          const val = localStorage.getItem(`plugin_setting_${key}`);
          try {
            return val ? JSON.parse(val) : def;
          } catch(e) {
            return val || def;
          }
        },
        set: (key, val) => {
          localStorage.setItem(`plugin_setting_${key}`, typeof val === 'string' ? val : JSON.stringify(val));
        },
        getGlobal: (key: string) => {
          if (key === 'geminiApiKey') {
             return localStorage.getItem('GLOBAL_GEMINI_API_KEY') || import.meta.env.VITE_GLOBAL_GEMINI_API_KEY || '';
          }
          return null;
        }
      },
      llm: {
        generateText: async (prompt: unknown, options?: any) => {
           const { generateContentFallback } = await import('../utils/aiModels');
           return generateContentFallback(prompt, options?.model);
        },
        generateTextStream: async (prompt: unknown, options?: any, onChunk?: (chunk: string) => void) => {
           const { generateContentFallback } = await import('../utils/aiModels');
           const result = await generateContentFallback(prompt, options?.model);
           if (onChunk) onChunk(result.text);
           return result;
        }
      },
      ui: {
        renderOverlay: (id, Component, position) => {
           let overlayNode = document.getElementById(`plugin-overlay-${id}`);
           if (!overlayNode) {
             overlayNode = document.createElement('div');
             overlayNode.id = `plugin-overlay-${id}`;
             overlayNode.style.position = 'fixed';
             overlayNode.style.zIndex = '9999';
             if (position) {
                 Object.assign(overlayNode.style, position);
             } else {
                 overlayNode.style.top = '0';
                 overlayNode.style.left = '0';
                 overlayNode.style.width = '100vw';
                 overlayNode.style.height = '100vh';
                 overlayNode.style.pointerEvents = 'none';
             }
             document.body.appendChild(overlayNode);
           }
           import('react-dom/client').then(({ createRoot }) => {
             import('react').then((React) => {
               // @ts-ignore
               const root = overlayNode._reactRoot || createRoot(overlayNode);
               // @ts-ignore
               overlayNode._reactRoot = root;
               root.render(React.createElement(Component, null));
             });
           });
        },
        closeOverlay: (id) => {
          const overlayNode = document.getElementById(`plugin-overlay-${id}`);
          if (overlayNode) {
             // @ts-ignore
             const root = overlayNode._reactRoot;
             if (root) root.unmount();
             overlayNode.remove();
          }
        },
        registerCardWidget: (widgetId, Component, position) => {
          console.log(`Sandbox: Registered Card Widget ${widgetId} at ${position || 'bottom'}`);
        }
      },
      getState: () => ({ 
        nodes: this.nodes,
        addChild: (parentId: string | null, content: string) => {
          const newNode: PuuNode = {
            id: "node-" + Date.now(),
            parentId: parentId || null,
            order: this.nodes.filter(n => n.parentId === (parentId || null)).length,
            content
          };
          this.nodes = [...this.nodes, newNode];
          this.notify();
          return newNode;
        },
        setNodes: (newNodes: PuuNode[]) => {
          this.nodes = newNodes;
          this.notify();
        }
      }),
      addJob: () => "job-" + Date.now(),
      updateJobProgress: (id, progress, statusText) => console.log(`Job ${id}: ${progress}% - ${statusText}`),
      completeJob: (id) => console.log(`Job ${id} completed`),
      failJob: (id, error) => console.error(`Job ${id} failed:`, error),
      toast: (msg, type) => alert(`Toast (${type}): ${msg}`),
    };
  }

  setSelection(nodeId: string, start: number, end: number, text: string) {
    this.activeSelection = { nodeId, start, end, text };
  }

  notify() {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  register(def: PluginDefinition) {
    this.plugin = def;
    if (def.init) {
      def.init(this.api);
    }
    this.notify();
  }

  getPlugin() {
    return this.plugin;
  }
}

export const registry = new MockRegistry();
