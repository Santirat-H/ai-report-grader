"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const API_BASE = '/api/backend';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewSection {
  sectionName: string;
  maxScore: number;
  aiScore: number;
  aiFeedback: string;
  score: number;
  feedback: string;
  isEdited: boolean;
}

interface FileDetail {
  id: string;
  name: string;
  url: string;
  status: string;
  totalScore: number;
  overallFeedback: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number, maxScore: number) {
  const r = maxScore > 0 ? score / maxScore : 0;
  if (r >= 0.75) return 'text-green-600';
  if (r >= 0.5)  return 'text-amber-600';
  return 'text-red-600';
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  section,
  onSave,
  onClose,
}: {
  section: ReviewSection;
  onSave: (sectionName: string, score: number, feedback: string) => void;
  onClose: () => void;
}) {
  const [score, setScore] = useState(section.score);
  const [feedback, setFeedback] = useState(section.feedback);
  const step = section.maxScore <= 10 ? 0.5 : 1;

  const revert = () => {
    setScore(section.aiScore);
    setFeedback(section.aiFeedback);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Edit Section</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section name */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Section</p>
            <p className="text-base font-semibold text-slate-900">{section.sectionName}</p>
          </div>

          {/* Score slider */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${scoreColor(score, section.maxScore)}`}>{fmt(score)}</span>
                <span className="text-sm text-slate-400">/ {section.maxScore}</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={section.maxScore}
              step={step}
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0</span>
              <span>{section.maxScore}</span>
            </div>
          </div>

          {/* Feedback textarea */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Feedback</p>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-4 text-slate-700 text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* AI reference */}
          <div className="bg-slate-50 rounded-xl p-4 flex gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-xs text-slate-500 leading-relaxed">
              <p className="font-semibold text-slate-700 mb-1">AI scored: <span className="font-bold">{fmt(section.aiScore)} / {section.maxScore}</span></p>
              <p className="italic">"{section.aiFeedback}"</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 flex gap-3">
          <button
            onClick={revert}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
          >
            Revert to AI
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(section.sectionName, score, feedback)}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main review component ────────────────────────────────────────────────────

function HumanReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileId = searchParams.get('id') ?? '';

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const [fileDetail, setFileDetail] = useState<FileDetail | null>(null);
  const [sections, setSections] = useState<ReviewSection[]>([]);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<ReviewSection | null>(null);

  const fetchData = useCallback(async () => {
    if (!fileId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/file/files/${fileId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      setFileDetail({
        id: data.id,
        name: data.name,
        url: data.url,
        status: data.status,
        totalScore: data.totalScore,
        overallFeedback: data.overallFeedback ?? '',
      });

      setOverallFeedback(
        data.humanReview?.overallFeedback ?? data.overallFeedback ?? '',
      );

      // Build sections: merge AI scores with human review if exists
      const built: ReviewSection[] = (data.aiSections ?? []).map((ai: any) => {
        const human = data.humanReview?.sectionsByName?.[ai.name];
        const hasHuman = human != null;
        const score    = hasHuman ? human.score    : ai.score;
        const feedback = hasHuman ? human.feedback : ai.feedback;
        return {
          sectionName: ai.name,
          maxScore: ai.maxScore,
          aiScore: ai.score,
          aiFeedback: ai.feedback,
          score,
          feedback,
          isEdited: hasHuman && (human.score !== ai.score || human.feedback !== ai.feedback),
        };
      });
      setSections(built);
    } catch (err) {
      console.error('Failed to load file:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (section: ReviewSection) => setEditingSection({ ...section });

  const applyEdit = (sectionName: string, score: number, feedback: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.sectionName === sectionName
          ? { ...s, score, feedback, isEdited: score !== s.aiScore || feedback !== s.aiFeedback }
          : s,
      ),
    );
    setEditingSection(null);
  };

  const handleSaveReview = async (confirm: boolean) => {
    if (!fileId || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/file/review/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sections.map((s) => ({
            sectionName: s.sectionName,
            score: s.score,
            feedback: s.feedback,
          })),
          overallFeedback,
          confirm,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (confirm) router.back();
      else await fetchData(); // refresh to show saved state
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save review. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotal = sections.reduce((sum, s) => sum + s.score, 0);
  const maxTotal     = sections.reduce((sum, s) => sum + s.maxScore, 0);
  const numEdited    = sections.filter((s) => s.isEdited).length;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading review…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Left: PDF Viewer ── */}
      <div className="w-1/2 border-r border-slate-200 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-medium text-slate-700 truncate text-sm">{fileDetail?.name ?? '—'}</span>
        </div>
        <div className="flex-1 overflow-hidden bg-slate-100">
          {fileDetail?.url ? (
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <Viewer fileUrl={fileDetail.url} plugins={[defaultLayoutPluginInstance]} />
            </Worker>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              PDF could not be loaded.
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Evaluation ── */}
      <div className="w-1/2 flex flex-col bg-white">

        {/* Summary header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-900">Evaluation Dashboard</h1>
            {numEdited > 0 && (
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">
                {numEdited} edited
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                {numEdited > 0 ? 'Human Score' : 'AI Score'}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-blue-900">{fmt(Math.round(currentTotal * 10) / 10)}</span>
                <span className="text-blue-500 font-medium text-sm">/ {maxTotal}</span>
              </div>
              {numEdited > 0 && fileDetail && (
                <p className="text-xs text-blue-400 mt-0.5">AI total: {fmt(fileDetail.totalScore)}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                fileDetail?.status === 'REVIEWED'  ? 'bg-green-100 text-green-700' :
                fileDetail?.status === 'COMPLETED' ? 'bg-purple-100 text-purple-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {fileDetail?.status ?? 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Section cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
              <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              No AI scores yet — run analysis first.
            </div>
          ) : (
            sections.map((section) => (
              <div
                key={section.sectionName}
                onClick={() => openEdit(section)}
                className="group border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-800 pr-2">{section.sectionName}</h3>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Badge */}
                    {section.isEdited ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                        HUMAN EDITED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI GENERATED
                      </span>
                    )}
                    {/* Score */}
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-xl font-bold ${scoreColor(section.score, section.maxScore)}`}>
                        {fmt(section.score)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/{section.maxScore}</span>
                    </div>
                    {/* AI reference when edited */}
                    {section.isEdited && (
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        AI: {fmt(section.aiScore)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score bar */}
                <div className="mb-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      section.score / section.maxScore >= 0.75 ? 'bg-green-500' :
                      section.score / section.maxScore >= 0.5  ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((section.score / section.maxScore) * 100, 100)}%` }}
                  />
                </div>

                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 italic">
                  "{section.feedback}"
                </p>

                {/* Edit hint */}
                <div className="absolute top-4 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Overall feedback */}
          {sections.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Overall Feedback</p>
              <textarea
                rows={3}
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder="Add overall feedback…"
                className="w-full text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <button
            onClick={() => handleSaveReview(false)}
            disabled={isSaving || sections.length === 0}
            className="flex-1 py-3 border border-slate-200 bg-white rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-sm disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSaveReview(true)}
            disabled={isSaving || sections.length === 0}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-200 text-sm disabled:opacity-40"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Review
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editingSection && (
        <EditModal
          section={editingSection}
          onSave={applyEdit}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}

export default function HumanReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center text-slate-500">Loading review…</div>
    }>
      <HumanReviewContent />
    </Suspense>
  );
}
