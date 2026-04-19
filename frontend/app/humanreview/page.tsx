"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface EvaluationCriterion {
  id: string;
  label: string;
  score: number; // 1-4
  feedback: string;
  isEdited: boolean;
  aiScore: number;
  aiFeedback: string;
}

interface EvaluationData {
  id: string;
  fileName: string;
  status: 'PENDING' | 'REVIEWED';
  criteria: {
    content: EvaluationCriterion;
    synthesis: EvaluationCriterion;
    references: EvaluationCriterion;
    format: EvaluationCriterion;
  };
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Improvement',
  2: 'Fair',
  3: 'Good',
  4: 'Excellent',
};

const mockData: Record<string, EvaluationData> = {
  '1': {
    id: '1',
    fileName: 'report-1.pdf',
    status: 'PENDING',
    criteria: {
      content: {
        id: 'content',
        label: 'Relevance & Content',
        score: 3,
        aiScore: 3,
        feedback: 'The paper covers all core concepts but lacks depth in the methodology section.',
        aiFeedback: 'The paper covers all core concepts but lacks depth in the methodology section.',
        isEdited: false,
      },
      synthesis: {
        id: 'synthesis',
        label: 'Synthesis & Analysis',
        score: 3,
        aiScore: 3,
        feedback: 'Good connection between sections, however, the synthesis of recent literature could be improved.',
        aiFeedback: 'Good connection between sections, however, the synthesis of recent literature could be improved.',
        isEdited: false,
      },
      references: {
        id: 'references',
        label: 'References',
        score: 4,
        aiScore: 4,
        feedback: 'Excellent use of peer-reviewed sources from the last 5 years.',
        aiFeedback: 'Excellent use of peer-reviewed sources from the last 5 years.',
        isEdited: false,
      },
      format: {
        id: 'format',
        label: 'Format & Organization',
        score: 4,
        aiScore: 4,
        feedback: 'Follows APA style correctly throughout the document.',
        aiFeedback: 'Follows APA style correctly throughout the document.',
        isEdited: false,
      },
    },
  },
};

function HumanReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') || '1';
  
  const [data, setData] = useState<EvaluationData | null>(null);
  const [editingCriterion, setEditingCriterion] = useState<EvaluationCriterion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [realFileUrl, setRealFileUrl] = useState<string | null>(null);
  const [realFileName, setRealFileName] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  // Initialize the plugin
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const res = await fetch('http://localhost:4000/file/files');
        if (res.ok) {
          const files = await res.json();
          const foundFile = files.find((f: any) => f.id === id);
          if (foundFile) {
            setRealFileUrl(foundFile.url);
            setRealFileName(foundFile.name);
          }
        }
      } catch (err) {
        console.error('Error fetching file data:', err);
      } finally {
        setIsPdfLoading(false);
      }
    };

    fetchFileData();

    if (mockData[id]) {
      setData(JSON.parse(JSON.stringify(mockData[id])));
    } else {
      setData(JSON.parse(JSON.stringify(mockData['1'])));
    }
  }, [id]);

  if (!data) return <div className="p-8">Loading...</div>;

  const handleEditClick = (criterion: EvaluationCriterion) => {
    setEditingCriterion({ ...criterion });
    setIsModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingCriterion && data) {
      const key = editingCriterion.id as keyof typeof data.criteria;
      
      // Update status to 'Human Edited' if score or feedback is different from AI
      const isChanged = 
        editingCriterion.score !== editingCriterion.aiScore || 
        editingCriterion.feedback !== editingCriterion.aiFeedback;
      
      const updatedCriterion = {
        ...editingCriterion,
        isEdited: isChanged
      };

      setData({
        ...data,
        criteria: {
          ...data.criteria,
          [key]: updatedCriterion
        }
      });
      setIsModalOpen(false);
    }
  };

  const handleConfirmReview = () => {
    alert(`Review confirmed for ${data.fileName}. Status changed to REVIEWED.`);
    router.push('/list');
  };

  const calculateOverallScore = () => {
    const c = data.criteria;
    const avg = (c.content.score + c.synthesis.score + c.references.score + c.format.score) / 4;
    return avg.toFixed(1);
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-slate-50">
      
      {/* Left Panel: PDF Viewer */}
      <div className="w-1/2 border-r border-slate-200 bg-slate-200 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <span className="font-medium text-slate-700 truncate">{realFileName || data.fileName}</span>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 flex flex-col relative justify-center">
          {isPdfLoading ? (
            <div className="flex justify-center items-center h-full text-slate-500 flex-col gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading PDF...</span>
            </div>
          ) : realFileUrl ? (
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <Viewer
                fileUrl={realFileUrl}
                plugins={[defaultLayoutPluginInstance]}
              />
            </Worker>
          ) : (
            <div className="flex justify-center items-center h-full text-slate-500">
              PDF not found or could not be loaded.
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Evaluation Dashboard */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-900">Evaluation Dashboard</h1>
          <div className="mt-4 flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div>
              <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Overall Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-blue-900">{calculateOverallScore()}</span>
                <span className="text-blue-500 font-medium">/ 4.0</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                data.status === 'REVIEWED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {data.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Object.values(data.criteria).map((criterion) => (
            <div 
              key={criterion.id}
              onClick={() => handleEditClick(criterion)}
              className="group border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-slate-800">{criterion.label}</h3>
                <div className="flex items-center gap-3">
                  {criterion.isEdited ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                      HUMAN EDITED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
                      AI GENERATED
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xl font-bold ${criterion.score >= 3 ? 'text-green-600' : criterion.score === 2 ? 'text-amber-600' : 'text-red-600'}`}>
                      {criterion.score}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ 4</span>
                  </div>
                </div>
              </div>
              <div className="mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  criterion.score === 4 ? 'text-green-600' : 
                  criterion.score === 3 ? 'text-blue-600' : 
                  criterion.score === 2 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {SCORE_LABELS[criterion.score]}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                "{criterion.feedback}"
              </p>
              <div className="absolute top-4 right-[-10px] opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleConfirmReview}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Confirm Review & Finalize
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingCriterion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Edit Evaluation</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Criterion
                </label>
                <div className="text-lg font-medium text-slate-900">{editingCriterion.label}</div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">
                  Score Rating
                </label>
                <div className="flex justify-between items-center gap-2">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditingCriterion({ ...editingCriterion, score: s })}
                      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        editingCriterion.score === s 
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2' 
                        : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        editingCriterion.score === s ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {editingCriterion.score === s && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className={`text-sm font-bold ${editingCriterion.score === s ? 'text-blue-700' : 'text-slate-500'}`}>
                        {s}
                      </span>
                      <span className={`text-[10px] font-medium text-center leading-tight ${editingCriterion.score === s ? 'text-blue-600' : 'text-slate-400'}`}>
                        {SCORE_LABELS[s]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Feedback Text
                </label>
                <textarea 
                  rows={4}
                  value={editingCriterion.feedback}
                  onChange={(e) => setEditingCriterion({...editingCriterion, feedback: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm leading-relaxed"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 flex gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Changing the score to anything other than the AI's original value (<strong>{editingCriterion.aiScore}</strong>) will mark it as <strong>Human Edited</strong>.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HumanReviewPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading review...</div>}>
      <HumanReviewContent />
    </Suspense>
  );
}
