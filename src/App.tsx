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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Chapter, CodexEntry } from './types';
import { generateStoryContent } from './services/ai';
import Markdown from 'react-markdown';

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

const ProjectSelector = ({ projects, currentProject, onSelect, onNew }: any) => (
  <div className="p-4 border-b border-stone-200">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Projects</h2>
      <button onClick={onNew} className="p-1 hover:bg-stone-200 rounded text-stone-600">
        <Plus size={16} />
      </button>
    </div>
    <div className="space-y-1">
      {projects.map((p: Project) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
            currentProject?.id === p.id 
              ? 'bg-stone-200 text-stone-900 font-semibold' 
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  </div>
);

// --- Tabs ---

const PlanTab = ({ project, chapters, onUpdateChapters, onUpdateProject }: any) => {
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [synopsis, setSynopsis] = useState(project.synopsis || '');
  const [outline, setOutline] = useState(project.outline || '');

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
    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...project, synopsis, outline }),
    });
    onUpdateProject();
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Story Plan</h1>
          <p className="text-stone-500 italic">Outline your acts, chapters, and scenes.</p>
        </div>
        <button 
          onClick={savePlan}
          className="flex items-center gap-2 px-6 py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all"
        >
          <Save size={20} />
          Save Plan
        </button>
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

const WriteTab = ({ project, chapters, codex }: any) => {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (chapters.length > 0 && !selectedChapter) {
      setSelectedChapter(chapters[0]);
      setContent(chapters[0].content || '');
    }
  }, [chapters]);

  const saveChapter = async () => {
    if (!selectedChapter) return;
    setIsSaving(true);
    await fetch(`/api/chapters/${selectedChapter.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: selectedChapter.title, content }),
    });
    setIsSaving(false);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const context = `
        Project: ${project.name}
        Codex: ${codex.map((e: CodexEntry) => `${e.name} (${e.type}): ${e.description}`).join('\n')}
        Current Chapter: ${selectedChapter?.title}
        Current Content: ${content.slice(-2000)}
      `;
      const result = await generateStoryContent(prompt, context);
      setContent(prev => prev + '\n\n' + result);
      setPrompt('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinuityCheck = async () => {
    setIsGenerating(true);
    try {
      const context = `
        Project: ${project.name}
        Codex: ${codex.map((e: CodexEntry) => `${e.name} (${e.type}): ${e.description}`).join('\n')}
        Current Chapter: ${selectedChapter?.title}
        Current Content: ${content}
      `;
      const result = await generateStoryContent("Analyze the current content for continuity errors based on the Codex. Flag any contradictions in character behavior, location details, or lore. Provide a brief summary of findings.", context);
      alert(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b border-stone-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <select 
            className="bg-stone-100 border-none rounded px-3 py-1 text-sm font-medium focus:ring-0"
            value={selectedChapter?.id}
            onChange={(e) => {
              const ch = chapters.find((c: Chapter) => c.id === Number(e.target.value));
              setSelectedChapter(ch);
              setContent(ch.content || '');
            }}
          >
            {chapters.map((c: Chapter) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {isSaving && <span className="text-xs text-stone-400 animate-pulse">Saving...</span>}
          <button 
            onClick={handleContinuityCheck}
            disabled={isGenerating}
            className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1"
          >
            <Sparkles size={12} />
            Continuity Check
          </button>
        </div>
        <button 
          onClick={saveChapter}
          className="flex items-center gap-2 px-4 py-1.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
        >
          <Save size={16} />
          Save
        </button>
      </header>

      <div className="flex-1 overflow-auto p-8 md:p-16 flex justify-center">
        <div className="w-full max-w-2xl">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full min-h-[60vh] bg-transparent border-none focus:ring-0 font-serif text-xl leading-relaxed resize-none placeholder-stone-300"
            placeholder="Once upon a time..."
          />
        </div>
      </div>

      <div className="p-4 border-t border-stone-200 bg-white shadow-2xl">
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
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Codex</h1>
          <p className="text-stone-500 italic">Your story's source of truth.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-stone-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-stone-800 transition-all"
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
            className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded">
                {entry.type}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2">{entry.name}</h3>
            <p className="text-stone-500 text-sm line-clamp-3">{entry.description}</p>
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
      </AnimatePresence>
    </div>
  );
};

const WorkshopTab = ({ project, codex }: any) => {
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
        Codex: ${codex.map((e: CodexEntry) => `${e.name} (${e.type}): ${e.description}`).join('\n')}
      `;
      const result = await generateStoryContent(userMsg, context);
      setMessages(prev => [...prev, { role: 'ai', text: result || 'I am not sure how to respond to that.' }]);
    } catch (err) {
      console.error(err);
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
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-stone-900 text-white shadow-md' 
                  : 'bg-stone-100 text-stone-900'
              }`}>
                <div className="markdown-body text-sm leading-relaxed">
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-stone-100 p-4 rounded-2xl animate-pulse text-stone-400 text-sm">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question or brainstorm an idea..."
              className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-stone-900"
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input}
              className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
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

export default function App() {
  const [activeTab, setActiveTab] = useState('plan');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [codex, setCodex] = useState<CodexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (currentProject) {
      fetchProjectData();
    }
  }, [currentProject]);

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
    if (data.length > 0 && !currentProject) {
      setCurrentProject(data[0]);
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

  const handleNewProject = async () => {
    const name = prompt('Project Name:');
    if (!name) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: '' }),
    });
    if (res.ok) fetchProjects();
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
            <SidebarItem 
              icon={Book} 
              label="Plan" 
              active={activeTab === 'plan'} 
              onClick={() => setActiveTab('plan')} 
            />
            <SidebarItem 
              icon={PenTool} 
              label="Write" 
              active={activeTab === 'write'} 
              onClick={() => setActiveTab('write')} 
            />
            <SidebarItem 
              icon={Database} 
              label="Codex" 
              active={activeTab === 'codex'} 
              onClick={() => setActiveTab('codex')} 
            />
            <SidebarItem 
              icon={MessageSquare} 
              label="Workshop" 
              active={activeTab === 'workshop'} 
              onClick={() => setActiveTab('workshop')} 
            />
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ProjectSelector 
            projects={projects} 
            currentProject={currentProject} 
            onSelect={setCurrentProject}
            onNew={handleNewProject}
          />
        </div>

        <div className="p-4 border-t border-stone-200">
          <SidebarItem 
            icon={SettingsIcon} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
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
                <button 
                  onClick={handleNewProject}
                  className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all"
                >
                  Create Your First Project
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'plan' && (
                  <PlanTab 
                    project={currentProject} 
                    chapters={chapters} 
                    onUpdateChapters={fetchProjectData} 
                    onUpdateProject={fetchProjects}
                  />
                )}
                {activeTab === 'write' && (
                  <WriteTab 
                    project={currentProject} 
                    chapters={chapters} 
                    codex={codex}
                  />
                )}
                {activeTab === 'codex' && (
                  <CodexTab 
                    project={currentProject} 
                    codex={codex} 
                    onUpdateCodex={fetchProjectData} 
                  />
                )}
                {activeTab === 'workshop' && (
                  <WorkshopTab 
                    project={currentProject} 
                    codex={codex} 
                  />
                )}
                {activeTab === 'settings' && (
                  <div className="p-8 max-w-2xl mx-auto">
                    <h1 className="text-4xl font-serif font-bold mb-8">Settings</h1>
                    <div className="space-y-8">
                      <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">AI Configuration</h2>
                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                          <label className="block text-sm font-medium mb-2">Gemini API Key (Optional)</label>
                          <input 
                            type="password" 
                            placeholder="Enter your key..."
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-stone-900"
                          />
                          <p className="mt-2 text-xs text-stone-400">If left blank, the platform's default key will be used.</p>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
