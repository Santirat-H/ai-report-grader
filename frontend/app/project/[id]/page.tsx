'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Layers,
  Hash,
  BarChart2,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import FileList from '../../components/file-list';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectSection {
  id: string;
  name: string;
  maxScore: number;
  rubric: string;
  order: number;
}

interface Project {
  id: string;
  name: string;
  assignmentDetails: string;
  sections: ProjectSection[];
  createdAt: string;
  updatedAt: string;
  _count: { files: number };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Sections Rubric ──────────────────────────────────────────────────────────

function SectionsRubric({ sections }: { sections: ProjectSection[] }) {
  const [open, setOpen] = useState(false);
  const totalMax = sections.reduce((sum, s) => sum + s.maxScore, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#1A2F5E]/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-[#1A2F5E]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Grading Rubric</p>
            <p className="text-xs text-gray-400">{sections.length} sections · {totalMax} pts total</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {sections.map((s, i) => (
            <div key={s.id} className="px-6 py-4 flex items-start gap-4">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#1A2F5E]/10 text-[#1A2F5E] text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-800">{s.name || `Section ${i + 1}`}</p>
                  <span className="text-[10px] font-semibold bg-blue-50 text-[#1A2F5E] px-2 py-0.5 rounded-full">
                    {s.maxScore} pts
                  </span>
                </div>
                {s.rubric && (
                  <p className="text-xs text-gray-500 leading-relaxed">{s.rubric}</p>
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

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [fileStats, setFileStats] = useState({ total: 0, pending: 0, completed: 0, avgScore: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [scoreMode, setScoreMode] = useState<'total' | 'average'>(() => {
    if (typeof window === 'undefined') return 'total';
    return (localStorage.getItem(`scoreMode_${id}`) as 'total' | 'average') ?? 'total';
  });

  const handleScoreModeChange = (mode: 'total' | 'average') => {
    setScoreMode(mode);
    localStorage.setItem(`scoreMode_${id}`, mode);
  };

  const loadStats = async () => {
    try {
      const filesRes = await fetch(`/api/backend/file/files?projectId=${id}`);
      if (filesRes.ok) {
        const files: any[] = await filesRes.json();
        const completed = files.filter(
          (f) => f.status === 'COMPLETED' || f.totalScore > 0,
        ).length;
        const pending = files.filter(
          (f) => f.status === 'PENDING' || f.status === 'PROCESSING',
        ).length;
        const scored = files.filter((f) => f.totalScore > 0);
        const avgScore =
          scored.length > 0
            ? scored.reduce((sum: number, f: any) => sum + (f.totalScore || 0), 0) / scored.length
            : 0;
        setFileStats({ total: files.length, pending, completed, avgScore });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const projectRes = await fetch(`/api/backend/projects/${id}`);
        if (projectRes.ok) {
          const projectData: Project = await projectRes.json();
          setProject(projectData);
        } else {
          router.push('/create');
          return;
        }
        await loadStats();
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#1A2F5E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-400">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const totalMax = project.sections.reduce((sum, s) => sum + s.maxScore, 0);
  const numSections = project.sections.length || 1;
  const maxPerSection = totalMax / numSections;
  const avgScorePerSection = fileStats.avgScore > 0 ? fileStats.avgScore / numSections : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/create')}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
                <span>Projects</span>
                <span>/</span>
                <span className="text-gray-600 font-medium truncate">{project.name}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 truncate">{project.name}</h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                <Hash className="h-3 w-3" />
                {project.sections.length} sections
              </span>
              <span className="flex items-center gap-1.5 bg-blue-50 text-[#1A2F5E] text-xs font-medium px-2.5 py-1 rounded-full">
                <BarChart2 className="h-3 w-3" />
                Max {totalMax} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">

        {/* Assignment details */}
        {project.assignmentDetails && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-[#1A2F5E]" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Assignment Details</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{project.assignmentDetails}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Files"
            value={fileStats.total}
            icon={FileText}
            color="bg-blue-50 text-[#1A2F5E]"
          />
          <StatCard
            label="Completed"
            value={fileStats.completed}
            icon={CheckCircle2}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            label="Pending"
            value={fileStats.pending}
            icon={Clock}
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            label={scoreMode === 'average' ? 'Average Score' : 'Total Score'}
            value={
              scoreMode === 'average'
                ? (avgScorePerSection > 0 ? avgScorePerSection.toFixed(2) : '—')
                : (fileStats.avgScore > 0 ? fileStats.avgScore.toFixed(2) : '—')
            }
            sub={
              scoreMode === 'average'
                ? (avgScorePerSection > 0 ? `out of ${maxPerSection.toFixed(2)} pts` : 'no scores yet')
                : (fileStats.avgScore > 0 ? `out of ${totalMax} pts` : 'no scores yet')
            }
            icon={TrendingUp}
            color="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Rubric sections */}
        <SectionsRubric sections={project.sections} />

        {/* File list scoped to this project */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Submitted Files</h2>
          <FileList projectId={id} scoreMode={scoreMode} onScoreModeChange={handleScoreModeChange} projectSections={project.sections} onFilesChanged={loadStats} />
        </div>
      </div>
    </div>
  );
}
