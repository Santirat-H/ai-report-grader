import React from 'react';
import Link from 'next/link';
import { PDFFile } from '../../types/file';

interface FileCardProps {
  file: PDFFile;
  onDelete: (file: PDFFile) => void;
}

function formatSize(input: any): string {
  const bytes = Number(input);
  if (isNaN(bytes) || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateOverallScore(scores: PDFFile['scores']): number {
  return Math.round(
    (scores.content + scores.synthesis + scores.references + scores.format) / 4
  );
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  const colorClass =
    score >= 85 ? 'text-green-600' : score >= 70 ? 'text-amber-600' : 'text-red-600';
  const barClass =
    score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col w-[60px]">
      <span className="text-[10px] text-slate-500 font-medium mb-1 truncate">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barClass}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function FileCard({ file, onDelete }: FileCardProps) {
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
              {new Date(file.uploadDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="mt-2.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                file.status === 'REVIEWED'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {file.status}
            </span>
          </div>
        </div>
      </div>

      {/* AI Scores */}
      <div className="flex flex-wrap md:flex-nowrap gap-4 md:gap-6 items-center flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center justify-center min-w-[60px]">
            <span className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              {calculateOverallScore(file.scores)}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
          </div>

          <div className="hidden sm:flex gap-4 border-l border-slate-100 pl-6">
            <ScoreItem label="Content" score={file.scores.content} />
            <ScoreItem label="Synthesis" score={file.scores.synthesis} />
            <ScoreItem label="Citations" score={file.scores.references} />
            <ScoreItem label="Formatting" score={file.scores.format} />
          </div>
        </div>

        <div className="flex items-center gap-2 pl-2">
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
