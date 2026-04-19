import React from 'react';
import { PDFFile } from '../../types/file';

interface DeleteModalProps {
  file: PDFFile | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteModal({ file, isDeleting, onCancel, onConfirm }: DeleteModalProps) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 text-red-600 mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Delete File?</h3>
        </div>

        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-800">"{file.name}"</span>? This action cannot be
          undone and the record will be permanently removed.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              if (!isDeleting) onCancel();
            }}
            disabled={isDeleting}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </>
            ) : (
              'Delete File'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
