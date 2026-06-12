import { useEffect, useState, useRef } from 'react';
import { registry, PuuNode } from './plugins/registry';
import myPlugin from './plugins/my-plugin'; // The user will edit this
import { Settings as SettingsIcon, TerminalSquare, X, Cpu } from 'lucide-react';

function NodeView({ node, plugin }: { node: PuuNode; plugin: any }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-app-card border border-app-border rounded p-4 shadow-sm relative group">
        {node.title && <h3 className="font-semibold mb-2">{node.title}</h3>}
        <textarea 
          className="w-full bg-transparent resize-none outline-none text-sm text-app-text-primary whitespace-pre-wrap placeholder:text-app-text-muted"
          value={node.content}
          spellCheck={false}
          placeholder="Напишите текст карточки здесь..."
          onChange={(e) => registry.api.document?.updateNodeContent(node.id, e.target.value)}
          onSelect={(e) => {
            const target = e.target as HTMLTextAreaElement;
            const { selectionStart, selectionEnd, value } = target;
            const selectedText = value.substring(selectionStart, selectionEnd);
            (registry as any).setSelection(node.id, selectionStart, selectionEnd, selectedText);
          }}
          onFocus={(e) => {
            const target = e.target as HTMLTextAreaElement;
            const { selectionStart, selectionEnd, value } = target;
            const selectedText = value.substring(selectionStart, selectionEnd);
            (registry as any).setSelection(node.id, selectionStart, selectionEnd, selectedText);
          }}
          style={{ minHeight: '60px' }}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
        />
        
        {/* Card Actions */}
        <div className="absolute top-2 right-2 flex gap-1 bg-app-card rounded shadow-sm border border-app-border p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {plugin?.cardActions?.filter((a: any) => !a.isVisible || a.isVisible(node.id, node)).map((action: any) => (
            <button
              key={action.id}
              onClick={() => action.onClick(node.id, node)}
              className="p-1 hover:bg-app-card-hover text-app-text-secondary rounded transition-colors"
              title={action.label}
            >
              <action.icon size={14} />
            </button>
          ))}
        </div>
      </div>
      
      {/* Render Children */}
      {node.children && node.children.length > 0 && (
        <div className="ml-6 pl-4 border-l-2 border-app-border flex flex-col gap-4">
          {node.children.map(child => (
            <NodeView key={child.id} node={child} plugin={plugin} />
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [stamp, setStamp] = useState(0);
  const [nodes, setNodes] = useState<PuuNode[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSandboxSettingsOpen, setIsSandboxSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    // Register the test plugin
    registry.register(myPlugin);
    
    // Subscribe to registry node/plugin changes
    const unsubscribe = registry.subscribe(() => {
      setNodes([...registry.nodes]); // new array to trigger re-render
      setStamp(s => s + 1);
    });
    
    // Initial load
    setNodes([...registry.nodes]);

    const updateActions = () => setStamp(s => s + 1);
    window.addEventListener('plugin-actions-updated', updateActions);
    return () => {
      window.removeEventListener('plugin-actions-updated', updateActions);
      unsubscribe();
    };
  }, []);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const plugin = registry.getPlugin();

  return (
    <div className="flex flex-col h-screen bg-app-bg text-app-text-primary">
      {/* Header */}
      <header className="h-12 border-b border-app-border bg-app-card flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="font-bold">PuuNote Sandbox</div>
          <div className="text-xs text-app-text-muted flex items-center gap-1 border border-app-border rounded px-2 py-0.5 bg-app-input-bg">
            <TerminalSquare size={12} />
            <span>Cmd+K for Commands</span>
          </div>
        </div>
        <div className="flex gap-2">
          {plugin?.headerActions?.map(action => (
            <div key={action.id} className="relative group">
              <button 
                onClick={action.onClick}
                className="p-1.5 rounded hover:bg-app-card-hover border border-app-border flex items-center justify-center w-8 h-8 text-app-text-secondary transition-colors"
                title={action.label}
              >
                <action.icon size={16} />
              </button>
              {action.dropdownItems && action.dropdownItems.length > 0 && (
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-app-panel border border-app-border rounded shadow-xl w-48 z-50">
                  {action.dropdownItems.map(item => (
                    <button 
                      key={item.id} 
                      onClick={item.onClick}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-app-card-hover flex items-center gap-2 transition-colors text-app-text-primary"
                    >
                      {item.icon && <item.icon size={14} className="text-app-text-muted"/>}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {/* Settings Button */}
          {plugin?.settingsComponent && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded hover:bg-app-card-hover border border-app-border flex items-center justify-center w-8 h-8 text-app-text-secondary transition-colors"
              title="Plugin Settings"
            >
              <SettingsIcon size={16} />
            </button>
          )}
          {/* Global Sandbox AI Settings */}
          <button
            onClick={() => setIsSandboxSettingsOpen(true)}
            className="p-1.5 rounded hover:bg-app-card-hover border border-app-border flex items-center justify-center w-8 h-8 text-app-text-secondary transition-colors"
            title="Sandbox Global Server/AI Settings"
          >
            <Cpu size={16} />
          </button>
        </div>
      </header>

      {/* Main workspace */}
      <main className="flex-1 overflow-auto p-8 flex flex-col items-center">
        <div className="max-w-md w-full flex flex-col gap-4">
          {nodes.map(node => (
            <NodeView key={node.id} node={node} plugin={plugin} />
          ))}
          
          <button 
            onClick={() => registry.api.getState?.()?.addChild(null, "Новая карточка (корень)")}
            className="w-full py-2 border-2 border-dashed border-app-border rounded-lg text-app-text-muted hover:bg-app-card-hover hover:border-app-text-muted transition-colors text-sm font-medium"
          >
            + Add Card
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && plugin?.settingsComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-app-card border border-app-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-panel">
              <h4 className="font-semibold text-app-text-primary flex items-center gap-2">
                <SettingsIcon size={18} className="text-app-text-muted"/>
                Plugin Settings
              </h4>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 hover:bg-app-card-hover rounded-md text-app-text-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <plugin.settingsComponent />
            </div>
          </div>
        </div>
      )}

      {/* Sandbox Global Settings Modal */}
      {isSandboxSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setIsSandboxSettingsOpen(false); }}>
          <div className="bg-app-card border border-app-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-panel">
              <h4 className="font-semibold text-app-text-primary flex items-center gap-2">
                <Cpu size={18} className="text-app-text-muted"/>
                Глобальные настройки ИИ (Sandbox)
              </h4>
              <button 
                onClick={() => setIsSandboxSettingsOpen(false)}
                className="p-1.5 hover:bg-app-card-hover rounded-md text-app-text-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-app-text-secondary mb-1">GLOBAL_GEMINI_MODELS (Fallback Chain)</label>
                <input 
                  type="text" 
                  className="w-full bg-app-input-bg border border-app-border rounded px-3 py-2 text-sm text-app-text-primary focus:ring-1 focus:ring-inset focus:ring-app-accent outline-none transition-shadow"
                  defaultValue={localStorage.getItem('GLOBAL_GEMINI_MODELS') || "gemini-2.5-pro, gemini-3-flash-preview, gemini-2.5-flash, gemini-3.1-flash-lite"}
                  onChange={(e) => localStorage.setItem('GLOBAL_GEMINI_MODELS', e.target.value)}
                  placeholder="gemini-2.5-pro, gemini-2.5-flash"
                />
                <p className="text-xs text-app-text-muted mt-1">
                  Список моделей через запятую. Эмулирует <code>GLOBAL_GEMINI_MODELS</code> из основного приложения для утилит вроде <code>generateContentFallback</code>.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-secondary mb-1">API Key (Test)</label>
                <input 
                  type="password" 
                  className="w-full bg-app-input-bg border border-app-border rounded px-3 py-2 text-sm text-app-text-primary focus:ring-1 focus:ring-inset focus:ring-app-accent outline-none transition-shadow"
                  defaultValue={localStorage.getItem('GLOBAL_GEMINI_API_KEY') || ""}
                  onChange={(e) => localStorage.setItem('GLOBAL_GEMINI_API_KEY', e.target.value)}
                  placeholder="AIza..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette Modal */}
      {isCommandPaletteOpen && plugin?.commands && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4 bg-black/20 backdrop-blur-sm"
             onClick={(e) => { if (e.target === e.currentTarget) setIsCommandPaletteOpen(false); }}>
          <div className="bg-app-card border border-app-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="p-2 border-b border-app-border bg-app-panel">
              <input 
                type="text" 
                placeholder="Search commands..." 
                autoFocus
                className="w-full bg-transparent border-none px-3 py-2 text-app-text-primary focus:outline-none placeholder:text-app-text-muted"
                onChange={() => {}} // Could add filtering here later
              />
            </div>
            <div className="p-2 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
              {plugin.commands.length === 0 && (
                <div className="p-4 text-center text-sm text-app-text-muted">No commands found.</div>
              )}
              {plugin.commands.map(cmd => (
                <button 
                  key={cmd.id}
                  onClick={() => {
                    cmd.execute();
                    setIsCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-lg hover:bg-app-card-hover transition-colors group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded border border-app-border bg-app-input-bg text-app-text-muted group-hover:text-app-text-primary group-hover:border-app-text-muted transition-colors">
                    {cmd.icon ? <cmd.icon size={16} /> : <TerminalSquare size={16} />}
                  </div>
                  <span className="text-sm font-medium text-app-text-primary">{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-8 border-t border-app-border bg-app-card flex items-center px-4 justify-end gap-2 text-sm">
        {plugin?.footerActions?.map(action => (
          <div key={action.id} className="relative group">
            <button 
              onClick={action.onClick}
              className="px-2 py-0.5 rounded hover:bg-app-card-hover border border-app-border flex items-center gap-1.5 text-app-text-secondary"
            >
              <action.icon size={14} />
              <span>{action.label}</span>
            </button>
            {action.dropdownItems && action.dropdownItems.length > 0 && (
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-app-panel border border-app-border rounded shadow-xl w-48 z-50">
                {action.dropdownItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={item.onClick}
                    className="w-full text-left px-3 py-2 hover:bg-app-card-hover flex items-center gap-2 text-app-text-primary"
                  >
                    {item.icon && <item.icon size={14} className="text-app-text-muted"/>}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </footer>
    </div>
  );
}

export default App;

