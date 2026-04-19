"use client";

import React from 'react';
import Link from 'next/link';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  date: string;
  status: 'completed' | 'processing' | 'failed';
}

interface UploadHistoryProps {
  files: UploadedFile[];
  onDelete?: (id: string) => void;
}

export default function UploadHistory({ files, onDelete }: UploadHistoryProps) {
  if (files.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-medium text-slate-800">No history yet</h3>
        <p className="text-sm text-slate-500 mt-1">Upload a PDF to see your evaluation history.</p>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-800">Recent Uploads</h2>
      </div>
      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {files.map((file) => (
          <div key={file.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-50 rounded-lg text-red-600 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-slate-800 truncate" title={file.name}>
                  {file.name}
                </h3>
                <div className="flex items-center text-xs text-slate-500 mt-1 space-x-2">
                  <span>{formatSize(file.size)}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>{new Date(file.date).toLocaleDateString()}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>{new Date(file.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 pl-4 shrink-0">
              {file.status === 'completed' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200/50">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                  Evaluated
                </span>
              )}
              {file.status === 'processing' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                  <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </span>
              )}
              {file.status === 'failed' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200/50">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                  Failed
                </span>
              )}
              
              {onDelete && (
                <button 
                  onClick={() => onDelete(file.id)}
                  className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                  title="Delete file"
                >
                  <span className="sr-only">Delete</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}

              <Link href={`/humanreview?id=${file.id}`} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors opacity-0 md:group-hover:opacity-100 focus:opacity-100">
                <span className="sr-only">View Details</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
