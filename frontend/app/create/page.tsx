'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Save,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  PencilLine,
  X,
  GripVertical,
  Layers,
  BookOpen,
  Hash,
  BarChart2,
  FileText,
  Download,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  name: string;
  maxScore: number;
  rubric: string;
}

interface Project {
  id: string;          // '' means unsaved new project
  name: string;
  assignmentDetails: string;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
  _count?: { files: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:4000';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function exportJson(projects: Project[]) {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projects_claude.json';
  a.click();
  URL.revokeObjectURL(url);
}

function makeSection(): Section {
  return { id: uid(), name: '', maxScore: 4, rubric: '' };
}

function makeProject(): Project {
  const now = new Date().toISOString();
  return {
    id: '',   // empty = not yet saved to backend
    name: 'New Grading Project',
    assignmentDetails: '',
    sections: [makeSection(), makeSection()],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  className = '',
  placeholder = 'Untitled',
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={`bg-transparent border-b-2 border-[#1A2F5E] outline-none ${className}`}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-pointer hover:text-[#1A2F5E] transition-colors group flex items-center gap-1.5 ${className}`}
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
      <PencilLine className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
    </span>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  section,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  section: Section;
  index: number;
  onUpdate: (updated: Section) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const defaultName = `column ${index + 1}`;
  const displayName = section.name || defaultName;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#1A2F5E] to-[#3B5FA0] rounded-l-2xl" />

      <div className="pl-5 pr-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-0.5">
                Section {index + 1}
              </span>
              <InlineEdit
                value={displayName}
                placeholder={defaultName}
                onSave={(v) => onUpdate({ ...section, name: v })}
                className="font-semibold text-gray-800 text-sm"
              />
            </div>
          </div>

          {canRemove && (
            <button
              onClick={onRemove}
              className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all duration-150"
              title="Remove section"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            Max Score
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={section.maxScore}
              onChange={(e) =>
                onUpdate({ ...section, maxScore: Math.max(1, Number(e.target.value)) })
              }
              className="w-24 px-3 py-1.5 text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A2F5E]/30 focus:border-[#1A2F5E] transition-all"
            />
            <span className="text-xs text-gray-400">points</span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            <FileText className="h-3.5 w-3.5" />
            Rubric Description
          </label>
          <textarea
            rows={3}
            value={section.rubric}
            placeholder={`Describe the grading criteria for "${displayName}"…`}
            onChange={(e) => onUpdate({ ...section, rubric: e.target.value })}
            className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1A2F5E]/30 focus:border-[#1A2F5E] transition-all placeholder-gray-300 leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Project Editor ───────────────────────────────────────────────────────────

function ProjectEditor({
  project,
  onSave,
  onDiscard,
  isSaving,
}: {
  project: Project;
  onSave: (p: Project) => void;
  onDiscard: () => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<Project>(project);

  function updateSection(index: number, updated: Section) {
    const sections = draft.sections.map((s, i) => (i === index ? updated : s));
    setDraft({ ...draft, sections });
  }

  function addSection() {
    setDraft({ ...draft, sections: [...draft.sections, makeSection()] });
  }

  function removeSection(index: number) {
    if (draft.sections.length <= 1) return;
    setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== index) });
  }

  function handleSave() {
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  }

  const totalMax = draft.sections.reduce((sum, s) => sum + s.maxScore, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-6 border-b border-gray-100 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A2F5E]/50 block mb-1">
              Project Name
            </span>
            <InlineEdit
              value={draft.name}
              placeholder="New Grading Project"
              onSave={(v) => setDraft({ ...draft, name: v })}
              className="text-2xl font-bold text-gray-900"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1">
            <button
              onClick={onDiscard}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X className="h-4 w-4" />
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#1A2F5E] hover:bg-[#243d76] rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save Project'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
            <Hash className="h-3 w-3" />
            {draft.sections.length} section{draft.sections.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 bg-blue-50 text-[#1A2F5E] text-xs font-medium px-2.5 py-1 rounded-full">
            <BarChart2 className="h-3 w-3" />
            Total max: {totalMax} pts
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
            <BookOpen className="h-3.5 w-3.5" />
            Assignment Details
          </label>
          <textarea
            rows={3}
            value={draft.assignmentDetails}
            placeholder="Describe the overall assignment or task for the LLM to understand the context…"
            onChange={(e) => setDraft({ ...draft, assignmentDetails: e.target.value })}
            className="w-full px-4 py-3 text-sm text-gray-700 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#1A2F5E]/30 focus:border-[#1A2F5E] transition-all placeholder-gray-300 leading-relaxed"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            Grading Sections
          </span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="space-y-3">
          {draft.sections.map((section, i) => (
            <SectionCard
              key={section.id}
              section={section}
              index={i}
              onUpdate={(updated) => updateSection(i, updated)}
              onRemove={() => removeSection(i)}
              canRemove={draft.sections.length > 1}
            />
          ))}
        </div>

        <button
          onClick={addSection}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-[#1A2F5E]/40 hover:text-[#1A2F5E] hover:bg-blue-50/50 transition-all duration-200 group"
        >
          <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
          Add Section
        </button>
      </div>
    </div>
  );
}

// ─── Project Card (list view) ─────────────────────────────────────────────────

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onViewDashboard,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onViewDashboard: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalMax = project.sections.reduce((sum, s) => sum + s.maxScore, 0);
  const fileCount = project._count?.files ?? 0;

  return (
    <div
      onClick={onViewDashboard}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#1A2F5E]/20 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">
              {project.name}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Updated {new Date(project.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="px-3 py-1.5 text-xs font-semibold text-[#1A2F5E] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
            <Hash className="h-2.5 w-2.5" />
            {project.sections.length} sections
          </span>
          <span className="flex items-center gap-1 bg-blue-50 text-[#1A2F5E] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
            <BarChart2 className="h-2.5 w-2.5" />
            Max {totalMax} pts
          </span>
          <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
            <FileText className="h-2.5 w-2.5" />
            {fileCount} file{fileCount !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Hide sections' : 'Show sections'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-5 py-3 bg-gray-50/50 space-y-2">
          {project.sections.map((s, i) => (
            <div key={s.id} className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#1A2F5E]/10 text-[#1A2F5E] text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700 leading-snug">
                  {s.name || `column ${i + 1}`}
                  <span className="ml-1.5 font-normal text-gray-400">({s.maxScore} pts)</span>
                </p>
                {s.rubric && (
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{s.rubric}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateBatchClaudePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadProjects() {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (res.ok) {
        const data: any[] = await res.json();
        setProjects(data.map(normalizeProject));
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function normalizeProject(d: any): Project {
    return {
      id: d.id,
      name: d.name,
      assignmentDetails: d.assignmentDetails ?? '',
      sections: (d.sections ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        maxScore: s.maxScore,
        rubric: s.rubric,
      })),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      _count: d._count,
    };
  }

  function handleCreate() {
    setEditing(makeProject());
  }

  async function handleSave(saved: Project) {
    setIsSaving(true);
    try {
      const body = {
        name: saved.name,
        assignmentDetails: saved.assignmentDetails,
        sections: saved.sections.map((s) => ({
          name: s.name,
          maxScore: s.maxScore,
          rubric: s.rubric,
        })),
      };

      let res: Response;
      if (!saved.id) {
        res = await fetch(`${API_BASE}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API_BASE}/projects/${saved.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        await loadProjects();
        setEditing(null);
      } else {
        alert('Failed to save project.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving project.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert('Failed to delete project.');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  // ── Editor view ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <ProjectEditor
          project={editing}
          onSave={handleSave}
          onDiscard={() => setEditing(null)}
          isSaving={isSaving}
        />
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1A2F5E] flex items-center justify-center">
                <Layers className="h-4 w-4 text-white" />
              </div>
              Batch Claude Projects
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Define flexible grading rubrics for Claude-powered evaluation
            </p>
          </div>

          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <button
                onClick={() => exportJson(projects)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#1A2F5E] bg-blue-50 hover:bg-blue-100 rounded-xl transition-all active:scale-95"
                title="Download projects_claude.json for the Python script"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>
            )}
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1A2F5E] hover:bg-[#243d76] rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <svg className="animate-spin mb-4 h-8 w-8 text-[#1A2F5E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-gray-400">Loading projects…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
              <FolderOpen className="h-8 w-8 text-gray-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No projects yet</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
              Create your first grading project to define sections, max scores, and rubrics
              for Claude to use when evaluating student work.
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1A2F5E] hover:bg-[#243d76] rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => setEditing(p)}
                onDelete={() => handleDelete(p.id)}
                onViewDashboard={() => router.push(`/project/${p.id}`)}
              />
            ))}

            <button
              onClick={handleCreate}
              className="h-full min-h-[180px] flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-[#1A2F5E]/40 hover:text-[#1A2F5E] hover:bg-blue-50/40 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </div>
              New Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
