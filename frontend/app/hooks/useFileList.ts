import { useState, useEffect, useRef } from 'react';
import { PDFFile } from '../types/file';

const API_BASE = '/api/backend';

export function useFileList(projectId?: string) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<PDFFile | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const url = projectId
        ? `${API_BASE}/file/files?projectId=${projectId}`
        : `${API_BASE}/file/files`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const mappedFiles: PDFFile[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          size: d.size || 0,
          uploadDate: new Date(d.createdAt).toISOString(),
          status: d.status || 'PENDING',
          totalScore: d.totalScore || 0,
          sectionScores: (d.sectionScores ?? []).map((s: any) => ({
            name: s.name,
            score: s.score,
            maxScore: s.maxScore,
          })),
        }));
        setFiles(mappedFiles);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('projectId', projectId);

    try {
      const res = await fetch(`${API_BASE}/file/pdf`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchFiles();
        setIsUploadModalOpen(false);
      } else {
        alert('File upload failed.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/file/files/${fileToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchFiles();
        setFileToDelete(null);
      } else {
        alert('Failed to delete file from server.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting file.');
    } finally {
      setIsDeleting(false);
    }
  };

  const analyzeFile = async (fileId: string) => {
    if (!projectId || analyzingFileId) return;
    setAnalyzingFileId(fileId);
    try {
      const res = await fetch(`${API_BASE}/file/analyze/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Analysis failed' }));
        alert(`Analysis failed: ${err.message || res.status}`);
      }
      await fetchFiles();
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Error during analysis. Is the backend running?');
    } finally {
      setAnalyzingFileId(null);
    }
  };

  return {
    files,
    isLoading,
    fetchError,
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
    fetchFiles,
  };
}
