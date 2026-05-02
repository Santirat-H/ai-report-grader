"use client";

import React, { useState } from 'react';
import { useFileList } from '../hooks/useFileList';
import { FileCard } from './file-list/FileCard';
import { UploadModal } from './file-list/UploadModal';
import { DeleteModal } from './file-list/DeleteModal';

export default function FileList({ projectId }: { projectId?: string } = {}) {
  const {
    files,
    isLoading,
    isUploading,
    isDeleting,
    analyzingFileId,
    fileToDelete,
    isUploadModalOpen,
    fileInputRef,
    setFileToDelete,
    setIsUploadModalOpen,
    handleUploadFile,
    handleDeleteFile,
    analyzeFile,
  } = useFileList(projectId);

  const [isDragActive, setIsDragActive] = useState(false);
  const [scoreMode, setScoreMode] = useState<'total' | 'average'>('total');

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        handleUploadFile(file);
      } else {
        alert('Please upload a PDF file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    handleUploadFile(e.target.files[0]);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">PDF Evaluation List</h2>
          <p className="text-slate-500 mt-1 text-sm">View and manage your AI-evaluated documents</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Score mode toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setScoreMode('total')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                scoreMode === 'total'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setScoreMode('average')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                scoreMode === 'average'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Average
            </button>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-[#1A2F5E] hover:bg-[#243d76] text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm ease-in-out duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload PDF
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <svg className="animate-spin mb-4 h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <h3 className="text-sm font-medium text-slate-600">Loading documents...</h3>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm text-center px-4">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">No documents yet</h3>
            <p className="text-sm text-slate-500 max-w-sm">Upload a PDF document to evaluate it against the rubrics.</p>
          </div>
        ) : (
          files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={setFileToDelete}
              onAnalyze={projectId ? analyzeFile : undefined}
              isAnalyzing={analyzingFileId === file.id}
              scoreMode={scoreMode}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        isUploading={isUploading}
        isDragActive={isDragActive}
        fileInputRef={fileInputRef}
        onClose={() => setIsUploadModalOpen(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
      />

      <DeleteModal
        file={fileToDelete}
        isDeleting={isDeleting}
        onCancel={() => setFileToDelete(null)}
        onConfirm={handleDeleteFile}
      />
    </div>
  );
}
