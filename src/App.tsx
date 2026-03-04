import React, { useState, useEffect } from 'react';
import { 
  Book, 
  PenTool, 
  Database, 
  MessageSquare, 
  Settings as SettingsIcon,
  Plus,
  ChevronRight,
  Save,
  Sparkles,
  Loader2,
  Trash2,
  Download,
  Bold,
  Italic,
  List,
  Type as TypeIcon,
  FileText,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Chapter, CodexEntry, Setting } from './types';
import { generateStoryContent, AIProvider, AIConfig } from './services/ai';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-stone-900 text-stone-50 shadow-lg' 
        : 'text-stone-500 hover:bg-stone-200 hover:text-stone-900'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

// --- Tabs ---

const PlanTab = ({ project, chapters, onUpdateChapters, onUpdateProject }: any) => {
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [synopsis, setSynopsis] = useState(project.synopsis || '');
  const [outline, setOutline] = useState(project.outline || '');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save logic for Plan
  useEffect(() => {
    const timer = setInterval(() => {
      savePlan();
    }, 30000); // 30 seconds
    return () => clearInterval(timer);
  }, [synopsis, outline]);

  const addChapter = async () => {
    if (!newChapterTitle) return;
    const res = await fetch(`/api/projects/${project.id}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newChapterTitle, content: '', order_index: chapters.length }),
    });
    if (res.ok) {
      setNewChapterTitle('');
      onUpdateChapters();
    }
  };

  const savePlan = async () => {
    setIsSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...project, synopsis, outline }),
    });
    setIsSaving(false);
    onUpdateProject();
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Story Plan</h1>
          <p className="text-stone-500 italic">Outline your acts, chapters, and scenes.</p>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 animate-pulse">Auto-saving...</span>}
          <button 
            onClick={savePlan}
            className="flex items-center gap-2 px-6 py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-sm"
          >
            <Save size={20} />
            Save Plan
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Synopsis</h2>
          <textarea 
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="What is your story about?"
            className="w-full h-48 bg-white border border-stone-200 rounded-xl p-4 focus:ring-2 focus:ring-stone-900 transition-all font-serif"
          />
        </section>
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Core Outline</h2>
          <textarea 
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="The high-level plot beats..."
            className="w-full h-48 bg-white border border-stone-200 rounded-xl p-4 focus:ring-2 focus:ring-stone-900 transition-all font-serif"
          />
        </section>
      </div>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Chapters</h2>
        <div className="space-y-4">
          {chapters.map((chapter: Chapter) => (
            <div key={chapter.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-xs font-bold text-stone-400">
                  {chapter.order_index + 1}
                </div>
                <h3 className="text-lg font-semibold">{chapter.title}</h3>
              </div>
              <ChevronRight className="text-stone-300 group-hover:text-stone-900 transition-colors" />
            </div>
          ))}

          <div className="flex gap-2 mt-8">
            <input
              type="text"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder="New chapter title..."
              className="flex-1 bg-white border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            <button
              onClick={addChapter}
              className="bg-stone-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-stone-800 transition-colors"
            >
              Add Chapter
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const WriteTab = ({ project, chapters, codex, aiConfig }: any) => {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState('');
  const [beats, setBeats] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showBeats, setShowBeats] = useState(false);

  useEffect(() => {
    if (chapters.length > 0 && !selectedChapter) {
      const ch = chapters[0];
      setSelectedChapter(ch);
      setContent(ch.content || '');
      setBeats(ch.beats || '');
    }
  }, [chapters]);

  // Auto-save logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedChapter) {
        saveChapter();
      }
    }, 30000); // 30 seconds
    return () => clearInterval(timer);
  }, [selectedChapter, content, beats]);

  const saveChapter = async () => {
    if (!selectedChapter) return;
    setIsSaving(true);
    await fetch(`/api/chapters/${selectedChapter.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: selectedChapter.title, content, beats }),
    });
    setIsSaving(false);
  };

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt) return;
    setIsGenerating(true);
    try {
      const context = `
        Project: ${project.name}
        Synopsis: ${project.synopsis}
        Codex: ${codex.map((e: CodexEntry) => `${e.name} (${e.type}): ${e.description}`).join('\n')}
        Current Chapter: ${selectedChapter?.title}
        Current Content: ${content.slice(-2000)}
      `;
      const result = await generateStoryContent(activePrompt, context, aiConfig);
      setContent(prev => prev + '\n\n' + result);
      if (!customPrompt) setPrompt('');
    } catch (err) {
      console.error(err);
      alert("AI Generation failed. Check your API key in Settings.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFromBeats = () => {
    if (!beats) return;
    handleGenerate(`Write the next scene based on these beats: ${beats}`);
  };

  const insertFormat = (prefix: string, suffix: string = prefix) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selection = text.substring(start, end);
    setContent(before + prefix + selection + suffix + after);
  };

  const exportChapter = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedChapter?.title || 'chapter'}.md`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="p-4 border-b border-stone-200 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-4">
          <select 
            className="bg-stone-100 border-none rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-stone-900"
            value={selectedChapter?.id}
            onChange={(e) => {
              const ch = chapters.find((c: Chapter) => c.id === Number(e.target.value));
              setSelectedChapter(ch);
              setContent(ch.content || '');
              setBeats(ch.beats || '');
            }}
          >
            {chapters.map((c: Chapter) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <div className="h-4 w-px bg-stone-200" />
          <div className="flex items-center gap-1">
            <button onClick={() => insertFormat('**')} className="p-2 hover:bg-stone-100 rounded text-stone-600" title="Bold"><Bold size={16} /></button>
            <button onClick={() => insertFormat('*')} className="p-2 hover:bg-stone-100 rounded text-stone-600" title="Italic"><Italic size={16} /></button>
            <button onClick={() => insertFormat('\n- ')} className="p-2 hover:bg-stone-100 rounded text-stone-600" title="List"><List size={16} /></button>
          </div>
          <div className="h-4 w-px bg-stone-200" />
          <button 
            onClick={() => setShowBeats(!showBeats)}
            className={cn(
              "text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-2",
              showBeats ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-900 hover:bg-stone-100"
            )}
          >
            <Layout size={14} />
            Beats
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 animate-pulse">Auto-saving...</span>}
          <button onClick={exportChapter} className="p-2 hover:bg-stone-100 rounded text-stone-600" title="Export Markdown"><Download size={18} /></button>
          <button 
            onClick={saveChapter}
            className="flex items-center gap-2 px-4 py-1.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 shadow-sm"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-8 md:p-16 flex justify-center bg-stone-50/30">
          <div className="w-full max-w-2xl bg-white p-12 shadow-sm border border-stone-100 min-h-full rounded-t-xl">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[80vh] bg-transparent border-none focus:ring-0 font-serif text-xl leading-relaxed resize-none placeholder-stone-200"
              placeholder="Begin your story here..."
            />
          </div>
        </div>

        <AnimatePresence>
          {showBeats && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-stone-200 bg-white flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Scene Beats</h3>
                <button 
                  onClick={generateFromBeats}
                  disabled={isGenerating || !beats}
                  className="text-[10px] font-bold uppercase bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  Generate Scene
                </button>
              </div>
              <textarea
                value={beats}
                onChange={(e) => setBeats(e.target.value)}
                placeholder="List your plot points for this scene..."
                className="flex-1 p-4 text-sm font-mono bg-stone-50/50 border-none focus:ring-0 resize-none"
              />
              <div className="p-4 bg-stone-50 border-t border-stone-200">
                <p className="text-[10px] text-stone-400 italic">Beats help the AI understand exactly what should happen in this scene.</p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-stone-200 bg-white shadow-2xl z-10">
        <div className="max-w-3xl mx-auto flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="What happens next? (e.g., 'Describe the character entering the tavern')"
              className="w-full bg-stone-100 border-none rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-stone-900 transition-all"
            />
            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          </div>
          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !prompt}
            className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CodexTab = ({ project, codex, onUpdateCodex }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CodexEntry | null>(null);
  const [newEntry, setNewEntry] = useState({ type: 'character', name: '', description: '', content: '' });

  const addEntry = async () => {
    const res = await fetch(`/api/projects/${project.id}/codex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    });
    if (res.ok) {
      setIsAdding(false);
      setNewEntry({ type: 'character', name: '', description: '', content: '' });
      onUpdateCodex();
    }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/codex/${id}`, { method: 'DELETE' });
    onUpdateCodex();
    setSelectedEntry(null);
  };

  const updateEntry = async (entry: CodexEntry) => {
    await fetch(`/api/codex/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    onUpdateCodex();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Codex</h1>
          <p className="text-stone-500 italic">Your story's source of truth.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-stone-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg"
        >
          <Plus size={20} />
          New Entry
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {codex.map((entry: CodexEntry) => (
          <motion.div 
            layout
            key={entry.id} 
            onClick={() => setSelectedEntry(entry)}
            className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded">
                {entry.type}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-stone-900">{entry.name}</h3>
            <p className="text-stone-500 text-sm line-clamp-3 leading-relaxed">{entry.description}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">New Codex Entry</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Type</label>
                  <select 
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2"
                  >
                    <option value="character">Character</option>
                    <option value="location">Location</option>
                    <option value="object">Object</option>
                    <option value="lore">Lore</option>
                    <option value="subplot">Subplot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={newEntry.name}
                    onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Brief Description</label>
                  <textarea 
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 h-24"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={addEntry}
                  className="flex-1 py-3 rounded-xl font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                >
                  Create Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedEntry && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded">
                  {selectedEntry.type}
                </span>
                <button onClick={() => setSelectedEntry(null)} className="text-stone-400 hover:text-stone-900">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <input 
                className="text-3xl font-bold mb-4 w-full border-none focus:ring-0 p-0"
                value={selectedEntry.name}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, name: e.target.value })}
                onBlur={() => updateEntry(selectedEntry)}
              />
              <textarea 
                className="text-stone-500 mb-6 w-full border-none focus:ring-0 p-0 resize-none h-24 italic"
                value={selectedEntry.description}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, description: e.target.value })}
                onBlur={() => updateEntry(selectedEntry)}
              />
              <div className="border-t border-stone-100 pt-6">
                <label className="block text-xs font-bold uppercase text-stone-400 mb-4">Detailed Content</label>
                <textarea 
                  className="w-full h-64 bg-stone-50 rounded-2xl p-6 border-none focus:ring-2 focus:ring-stone-900 font-serif text-lg leading-relaxed"
                  value={selectedEntry.content || ''}
                  onChange={(e) => setSelectedEntry({ ...selectedEntry, content: e.target.value })}
                  onBlur={() => updateEntry(selectedEntry)}
                  placeholder="Expand on this character, location, or lore..."
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WorkshopTab = ({ project, codex, aiConfig }: any) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const context = `
        Project: ${project.name}
        Synopsis: ${project.synopsis}
        Codex: ${codex.map((e: CodexEntry) => `${e.name} (${e.type}): ${e.description}`).join('\n')}
      `;
      const result = await generateStoryContent(userMsg, context, aiConfig);
      setMessages(prev => [...prev, { role: 'ai', text: result || 'I am not sure how to respond to that.' }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Error: AI generation failed. Please check your API settings.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-4xl font-serif font-bold mb-2">Workshop</h1>
        <p className="text-stone-500 italic">Brainstorm, roleplay, and analyze your story.</p>
      </header>
      
      <div className="flex-1 bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 text-center">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="max-w-xs italic">Ask me anything about your story, characters, or world.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={cn(
                "max-w-[85%] p-5 rounded-2xl shadow-sm",
                msg.role === 'user' 
                  ? 'bg-stone-900 text-white' 
                  : 'bg-stone-50 text-stone-900 border border-stone-100'
              )}>
                <div className="prose prose-stone prose-sm max-w-none">
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl flex items-center gap-3 text-stone-400 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Consulting the muse...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50/50">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question or brainstorm an idea..."
              className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-stone-900 shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input}
              className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-stone-800 transition-all shadow-lg"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const SettingsTab = ({ settings, onUpdate }: any) => {
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const s: Record<string, string> = {};
    settings.forEach((item: Setting) => {
      s[item.key] = item.value;
    });
    setLocalSettings(s);
  }, [settings]);

  const saveSetting = async (key: string, value: string) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    onUpdate();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-serif font-bold mb-8">Settings</h1>
      <div className="space-y-8">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">AI Configuration (BYOK)</h2>
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Active Provider</label>
              <select 
                value={localSettings['ai_provider'] || 'gemini'}
                onChange={(e) => saveSetting('ai_provider', e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-400 mb-1">OpenAI API Key</label>
                <input 
                  type="password" 
                  value={localSettings['openai_key'] || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, openai_key: e.target.value })}
                  onBlur={(e) => saveSetting('openai_key', e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Anthropic API Key</label>
                <input 
                  type="password" 
                  value={localSettings['anthropic_key'] || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, anthropic_key: e.target.value })}
                  onBlur={(e) => saveSetting('anthropic_key', e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-stone-400 mb-1">OpenRouter API Key</label>
                <input 
                  type="password" 
                  value={localSettings['openrouter_key'] || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, openrouter_key: e.target.value })}
                  onBlur={(e) => saveSetting('openrouter_key', e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
            <p className="text-xs text-stone-400 italic">Keys are stored locally in your database. Gemini uses the platform's default key if not specified.</p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Export All Data</h2>
          <button className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 font-bold hover:border-stone-900 hover:text-stone-900 transition-all">
            Download Project Backup (.json)
          </button>
        </section>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('plan');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [codex, setCodex] = useState<CodexEntry[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const [pRes, sRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/settings')
    ]);
    const pData = await pRes.json();
    const sData = await sRes.json();
    setProjects(pData);
    setSettings(sData);
    if (pData.length > 0 && !currentProject) {
      setCurrentProject(pData[0]);
    }
    setIsLoading(false);
  };

  const fetchProjectData = async () => {
    if (!currentProject) return;
    const [chaptersRes, codexRes] = await Promise.all([
      fetch(`/api/projects/${currentProject.id}/chapters`),
      fetch(`/api/projects/${currentProject.id}/codex`)
    ]);
    setChapters(await chaptersRes.json());
    setCodex(await codexRes.json());
  };

  useEffect(() => {
    if (currentProject) {
      fetchProjectData();
    }
  }, [currentProject]);

  const getAIConfig = (): AIConfig => {
    const provider = (settings.find(s => s.key === 'ai_provider')?.value || 'gemini') as AIProvider;
    let apiKey = '';
    if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || '';
    else if (provider === 'openai') apiKey = settings.find(s => s.key === 'openai_key')?.value || '';
    else if (provider === 'anthropic') apiKey = settings.find(s => s.key === 'anthropic_key')?.value || '';
    else if (provider === 'openrouter') apiKey = settings.find(s => s.key === 'openrouter_key')?.value || '';
    
    return { provider, apiKey };
  };

  const handleNewProject = async () => {
    const name = prompt('Project Name:');
    if (!name) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: '' }),
    });
    if (res.ok) fetchInitialData();
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project and all its data?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    fetchInitialData();
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-stone-400" size={48} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-stone-200 flex flex-col bg-stone-50 z-10">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <h1 className="font-serif font-bold text-xl tracking-tight">Olonkpo Novels</h1>
          </div>
          
          <nav className="space-y-2">
            <SidebarItem icon={Book} label="Plan" active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
            <SidebarItem icon={PenTool} label="Write" active={activeTab === 'write'} onClick={() => setActiveTab('write')} />
            <SidebarItem icon={Database} label="Codex" active={activeTab === 'codex'} onClick={() => setActiveTab('codex')} />
            <SidebarItem icon={MessageSquare} label="Workshop" active={activeTab === 'workshop'} onClick={() => setActiveTab('workshop')} />
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Projects</h2>
              <button onClick={handleNewProject} className="p-1 hover:bg-stone-200 rounded text-stone-600">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1">
              {projects.map((p: Project) => (
                <div key={p.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => setCurrentProject(p)}
                    className={cn(
                      "flex-1 text-left px-3 py-2 rounded text-sm transition-colors truncate",
                      currentProject?.id === p.id ? 'bg-stone-200 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-100'
                    )}
                  >
                    {p.name}
                  </button>
                  <button 
                    onClick={() => handleDeleteProject(p.id)}
                    className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-200">
          <SidebarItem icon={SettingsIcon} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (currentProject?.id || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto"
          >
            {!currentProject ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 p-8 text-center">
                <Book size={64} className="mb-4 opacity-20" />
                <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">No Project Selected</h2>
                <p className="max-w-xs mb-8">Create a new project to start your writing journey.</p>
                <button onClick={handleNewProject} className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all">
                  Create Your First Project
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'plan' && <PlanTab project={currentProject} chapters={chapters} onUpdateChapters={fetchProjectData} onUpdateProject={fetchInitialData} />}
                {activeTab === 'write' && <WriteTab project={currentProject} chapters={chapters} codex={codex} aiConfig={getAIConfig()} />}
                {activeTab === 'codex' && <CodexTab project={currentProject} codex={codex} onUpdateCodex={fetchProjectData} />}
                {activeTab === 'workshop' && <WorkshopTab project={currentProject} codex={codex} aiConfig={getAIConfig()} />}
                {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={fetchInitialData} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
