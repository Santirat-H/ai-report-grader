import { useState, useEffect, useRef } from 'react';
import { PDFFile } from '../types/file';

const API_BASE = 'http://localhost:4000';

export function useFileList() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<PDFFile | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/file/files`);
      if (res.ok) {
        const data = await res.json();
        const mappedFiles: PDFFile[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          size: d.size || 0,
          uploadDate: new Date(d.createdAt).toISOString(),
          status: 'PENDING',
          // Static mock scores since the backend doesn't calculate real scores yet
          scores: {
            content: Math.floor(Math.random() * (95 - 60) + 60),
            synthesis: Math.floor(Math.random() * (95 - 60) + 60),
            references: Math.floor(Math.random() * (95 - 60) + 60),
            format: Math.floor(Math.random() * (95 - 60) + 60),
          },
        }));
        setFiles(mappedFiles);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

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
      const res = await fetch(`${API_BASE}/file/files/${fileToDelete.name}`, {
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

  return {
    files,
    isLoading,
    isUploading,
    isDeleting,
    fileToDelete,
    isUploadModalOpen,
    fileInputRef,
    setFileToDelete,
    setIsUploadModalOpen,
    handleUploadFile,
    handleDeleteFile,
  };
}
