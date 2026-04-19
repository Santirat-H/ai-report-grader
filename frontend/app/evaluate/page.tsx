"use client";

import React, { useState, useEffect } from 'react';
import PdfUploader from '../components/pdf-uploader';
import UploadHistory, { UploadedFile } from '../components/upload-history';

export default function EvaluatePage() {
  const [history, setHistory] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:4000/file/files');
      if (res.ok) {
        const data = await res.json();
        const mappedFiles: UploadedFile[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          size: d.size || 0,
          date: new Date(d.createdAt).toISOString(),
          status: 'completed'
        }));
        setHistory(mappedFiles);
      }
    } catch (err) {
      console.warn('Backend connection failed:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileSelect = async (file: File) => {
    if (isUploading) return;

    const tempId = Math.random().toString(36).substring(7);
    const newFile: UploadedFile = {
      id: tempId,
      name: file.name,
      size: file.size,
      date: new Date().toISOString(),
      status: 'processing'
    };
    
    setHistory(prev => [newFile, ...prev]);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:4000/file/pdf', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchHistory();
      } else {
        alert('File upload failed.');
        setHistory(prev => prev.map(f => f.id === tempId ? { ...f, status: 'failed' } : f));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file.');
      setHistory(prev => prev.map(f => f.id === tempId ? { ...f, status: 'failed' } : f));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setHistory(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Evaluate Document</h1>
        <p className="text-slate-500 mt-2">Upload a PDF document to evaluate and analyze its contents.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload New Document</h2>
              <PdfUploader onFileSelect={handleFileSelect} />
            </div>
            
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center mb-2">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Supported Formats
              </h3>
              <ul className="text-sm text-blue-700/80 space-y-1 ml-6 list-disc">
                <li>PDF documents up to 50MB</li>
                <li>Text-searchable PDFs provide best results</li>
                <li>Scanned documents may take longer</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <UploadHistory files={history} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
}
