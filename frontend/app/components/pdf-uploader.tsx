"use client";

import React, { useCallback, useState } from 'react';

interface PdfUploaderProps {
  onFileSelect: (file: File) => void;
}

export default function PdfUploader({ onFileSelect }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  }, [onFileSelect]);

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors duration-200 ease-in-out ${
        isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-slate-400 bg-white"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${isDragging ? "bg-blue-100" : "bg-slate-100"}`}>
          <svg className={`w-8 h-8 ${isDragging ? "text-blue-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-slate-800">
            Drag & Drop your PDF here
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            or click to browse from your computer
          </p>
        </div>
        <input 
          type="file" 
          accept="application/pdf"
          className="hidden" 
          id="pdf-upload"
          onChange={handleFileInput}
        />
        <label 
          htmlFor="pdf-upload" 
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm inline-block"
        >
          Select File
        </label>
      </div>
    </div>
  );
}
