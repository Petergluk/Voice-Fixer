import type { ComponentType, ReactNode } from "react";


export interface PuuNode {
  id: string;
  type: "document" | "branch" | "note";
  title?: string;
  content: string;
  children: PuuNode[];
}

export interface CommandHook {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  hotkey?: string;
  execute: () => void;
}

export interface CardActionHook {
  id: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  showOnHover?: boolean;
  isVisible?: (node: PuuNode) => boolean;
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

export interface PluginHooks {
  onNodeCreated?: (node: PuuNode) => void;
  onNodeUpdated?: (nodeId: string, node: PuuNode) => void;
  onNodeDeleted?: (nodeId: string) => void;
}

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
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
  plugins: {
    addCommand: (command: CommandHook) => void;
  };
  events?: {
    on: (eventName: "nodeSelected" | "nodeChanged" | "treeChanged", callback: (data: any) => void) => void;
    off: (eventName: string, callback: Function) => void;
  };
  document: {
    addNode: (content: string, parentId?: string | null) => string;
    deleteNode: (id: string) => void;
    // basic operations
    getNode: (id: string) => PuuNode | null;
    updateNodeContent: (id: string, content: string) => void;
    getActiveNodeId?: () => string | null;
    setNodeMetadata?: (id: string, key: string, value: any) => void;
    getNodeMetadata?: (id: string, key: string) => any;
    resolveContext?: (id: string, scope: "card" | "document" | "level_branch" | "level_all" | "branch_parent" | "branch_children" | string) => string;
    batchUpdate?: (updates: {id: string, content?: string, metadata?: Record<string,any>}[]) => void;
    addAttachment?: (id: string, file: File | {name: string, type: string, url: string}) => void;
    getAttachments?: (id: string) => {id: string; name: string; type: string; url: string}[];
    removeAttachment?: (nodeId: string, attachmentId: string) => void;
  };
  editor?: {
    getActiveSelection: () => EditorSelection | null;
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
    renderOverlay: (id: string, Component: React.ComponentType<any>, position?: any) => void;
    closeOverlay: (id: string) => void;
    registerCardWidget?: (widgetId: string, Component: React.ComponentType<{node: PuuNode}>, position?: "top" | "bottom" | "replace") => void;
  };
  getState?: () => any; // Returns the AppStore state
  addJob?: (title: string, onCancel?: () => void) => string;
  updateJobProgress?: (id: string, progress: number, statusText?: string) => void;
  completeJob?: (id: string, resultLabel?: string, onClick?: () => void) => void;
  failJob?: (id: string, error: string) => void;
  cancelJob?: (id: string) => void;
  toast?: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}

export interface JobInfo {
  id: string;
  title: string;
  progress: number;
  statusText?: string;
  error?: string;
  completed?: boolean;
  onCancel?: () => void;
}

export interface ToastInfo {
  id: string;
  msg: string;
  type: "success" | "error" | "warning" | "info";
}

// Minimal mock Registry 
class MockRegistry {
  plugin: PluginDefinition | null = null;
  api: PluginAPI;
  
  nodes: PuuNode[] = [
    {
      id: "test-node-1",
      type: "note",
      title: "Test Note",
      content: "Это тестовая карточка для проверки работы плагинов.\n\nВы можете редактировать этот текст как вам удобно, чтобы проверить, как ваш плагин справляется с различными задачами, например:\n- Выполнение перевода текста.\n- Исправление орфографии.\n- Краткий пересказ (суммаризация).\n- Извлечение важных мыслей или ключевых слов.\n- Отправка содержимого в нейросеть.\n\nThe quick brown fox jumps over the lazy dog.",
      children: []
    }
  ];
  jobs: JobInfo[] = [];
  toasts: ToastInfo[] = [];
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
            type: "note",
            title: "",
            content,
            children: []
          };
          if (!parentId) {
            this.nodes = [...this.nodes, newNode];
          } else {
            const addToParent = (nodesList: PuuNode[]): boolean => {
              for (const n of nodesList) {
                if (n.id === parentId) {
                  n.children = [...n.children, newNode];
                  return true;
                }
                if (n.children && addToParent(n.children)) return true;
              }
              return false;
            };
            addToParent(this.nodes);
            this.nodes = [...this.nodes];
          }
          this.notify();
          return newNode.id;
        },
        deleteNode: (id) => {
          const deleteFromList = (nodesList: PuuNode[]): PuuNode[] => {
            return nodesList.filter(n => {
              if (n.id === id) return false;
              if (n.children) n.children = deleteFromList(n.children);
              return true;
            });
          };
          this.nodes = deleteFromList(this.nodes);
          this.notify();
        },
        getNode: (id) => {
          const findNode = (nodesList: PuuNode[]): PuuNode | null => {
            for (const n of nodesList) {
              if (n.id === id) return n;
              if (n.children) {
                const found = findNode(n.children);
                if (found) return found;
              }
            }
            return null;
          };
          return findNode(this.nodes);
        },
        updateNodeContent: (id, content) => {
          const findNode = (nodesList: PuuNode[]): PuuNode | null => {
            for (const n of nodesList) {
              if (n.id === id) return n;
              if (n.children) {
                const found = findNode(n.children);
                if (found) return found;
              }
            }
            return null;
          };
          const node = findNode(this.nodes);
          if (node) {
            node.content = content;
            this.notify();
          }
        },
        getActiveNodeId: () => {
          return this.activeSelection?.nodeId || null;
        },
        setNodeMetadata: (id, key, value) => {
          console.log(`Mock setNodeMetadata for ${id}: ${key} =`, value);
        },
        getNodeMetadata: (id, key) => null,
        resolveContext: (id, scope) => `(Mock context for ${id} with scope ${scope})\nThis is some mock text returned for templating.`,
        batchUpdate: (updates) => {
          updates.forEach(u => {
            if (u.content !== undefined) this.api.document.updateNodeContent(u.id, u.content);
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
            type: "note",
            content,
            children: []
          };
          
          if (!parentId) {
            this.nodes = [...this.nodes, newNode];
          } else {
            // recursive search to find parent and add to children
            const addToParent = (nodesList: PuuNode[]): boolean => {
              for (const n of nodesList) {
                if (n.id === parentId) {
                  n.children = [...n.children, newNode];
                  return true;
                }
                if (n.children && addToParent(n.children)) {
                  return true;
                }
              }
              return false;
            };
            addToParent(this.nodes);
            this.nodes = [...this.nodes]; // trigger re-render
          }
          this.notify();
          return newNode;
        },
        setNodes: (newNodes: PuuNode[]) => {
          this.nodes = newNodes;
          this.notify();
        }
      }),
      addJob: (title, onCancel) => {
        const id = "job-" + Date.now();
        this.jobs.push({ id, title, progress: 0, onCancel });
        this.notify();
        return id;
      },
      updateJobProgress: (id, progress, statusText) => {
        const job = this.jobs.find(j => j.id === id);
        if (job) {
          job.progress = progress;
          job.statusText = statusText;
          this.notify();
        }
      },
      completeJob: (id, resultLabel) => {
        const job = this.jobs.find(j => j.id === id);
        if (job) {
          job.completed = true;
          if (resultLabel) job.statusText = resultLabel;
          job.progress = 100;
          this.notify();
          setTimeout(() => {
            this.jobs = this.jobs.filter(j => j.id !== id);
            this.notify();
          }, 3000);
        }
      },
      failJob: (id, error) => {
        const job = this.jobs.find(j => j.id === id);
        if (job) {
          job.error = error;
          this.notify();
          setTimeout(() => {
            this.jobs = this.jobs.filter(j => j.id !== id);
            this.notify();
          }, 5000);
        }
      },
      cancelJob: (id) => {
        const job = this.jobs.find(j => j.id === id);
        if (job && job.onCancel) {
          job.onCancel();
        }
        this.jobs = this.jobs.filter(j => j.id !== id);
        this.notify();
      },
      toast: (msg, type = "info") => {
        const id = "toast-" + Date.now();
        this.toasts.push({ id, msg, type });
        this.notify();
        setTimeout(() => {
          this.toasts = this.toasts.filter(t => t.id !== id);
          this.notify();
        }, 3000);
      },
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
