import React from 'react';
import Link from 'next/link';
import { PDFFile } from '../../types/file';

interface FileCardProps {
  file: PDFFile;
  onDelete: (file: PDFFile) => void;
  onAnalyze?: (fileId: string) => void;
  isAnalyzing?: boolean;
  scoreMode?: 'total' | 'average';
}

function formatSize(input: any): string {
  const bytes = Number(input);
  if (isNaN(bytes) || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function ScoreItem({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const barWidth = Math.min(ratio * 100, 100);
  const colorClass = ratio >= 0.75 ? 'text-green-600' : ratio >= 0.5 ? 'text-amber-600' : 'text-red-600';
  const barClass  = ratio >= 0.75 ? 'bg-green-500'  : ratio >= 0.5 ? 'bg-amber-500'  : 'bg-red-500';
  const display = Number.isInteger(score) ? String(score) : score.toFixed(1);

  return (
    <div className="flex flex-col w-[64px]">
      <span className="text-[10px] text-slate-500 font-medium mb-1 truncate" title={label}>{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${barWidth}%` }} />
        </div>
        <span className={`text-[10px] font-semibold tabular-nums ${colorClass}`}>{display}</span>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING:    'bg-amber-50  text-amber-700  border-amber-200',
  PROCESSING: 'bg-blue-50   text-blue-700   border-blue-200',
  COMPLETED:  'bg-green-50  text-green-700  border-green-200',
  FAILED:     'bg-red-50    text-red-700    border-red-200',
  REVIEWED:   'bg-green-50  text-green-700  border-green-200',
};

export function FileCard({ file, onDelete, onAnalyze, isAnalyzing = false, scoreMode = 'total' }: FileCardProps) {
  const hasAiScore = file.totalScore > 0;
  const numSections = file.sectionScores.length;

  const summaryValue = hasAiScore
    ? (scoreMode === 'average' && numSections > 0
        ? file.totalScore / numSections
        : file.totalScore)
    : null;

  const displayScore = summaryValue !== null
    ? summaryValue.toFixed(2).replace(/\.?0+$/, '')
    : '—';

  const scoreLabel = !hasAiScore ? 'Score' : scoreMode === 'average' ? 'Avg' : 'Total';

  return (
    <Link
      href={`/humanreview?id=${file.id}`}
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-5"
    >
      {/* File Info */}
      <div className="flex-1 flex items-start gap-4">
        <div className="p-3 bg-red-50 border border-red-100/50 rounded-xl text-red-600 group-hover:bg-red-100 group-hover:border-red-200 transition-colors shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate mb-1 group-hover:text-blue-700 transition-colors">
            {file.name}
          </h3>
          <div className="flex items-center text-xs text-slate-500 space-x-2">
            <span>{formatSize(file.size)}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span>
              {new Date(file.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                STATUS_STYLES[file.status] ?? STATUS_STYLES.PENDING
              }`}
            >
              {file.status}
            </span>
            {hasAiScore && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Graded
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scores + Actions */}
      <div className="flex flex-wrap md:flex-nowrap gap-4 md:gap-6 items-center flex-shrink-0">
        <div className="flex items-start gap-6">
          {/* Summary score */}
          <div className="flex flex-col items-center justify-center min-w-[56px]">
            <span className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              {displayScore}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {scoreLabel}
            </span>
          </div>

          {/* Per-section score bars — only shown when AI has graded */}
          {hasAiScore && numSections > 0 && (
            <div className="hidden sm:flex flex-wrap gap-x-4 gap-y-2 border-l border-slate-100 pl-6 max-w-sm">
              {file.sectionScores.map((s) => (
                <ScoreItem key={s.name} label={s.name} score={s.score} maxScore={s.maxScore} />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2">
          {/* Analyze button */}
          {onAnalyze && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isAnalyzing) onAnalyze(file.id);
              }}
              disabled={isAnalyzing}
              title={isAnalyzing ? 'Analyzing…' : 'Analyze with AI'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all z-10 ${
                isAnalyzing
                  ? 'bg-[#1A2F5E]/10 text-[#1A2F5E] cursor-not-allowed'
                  : 'bg-[#1A2F5E] text-white hover:bg-[#243d76] active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyze
                </>
              )}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(file);
            }}
            className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-all z-10"
            title="Delete File"
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Arrow hint */}
          <div className="hidden md:block p-1.5 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
