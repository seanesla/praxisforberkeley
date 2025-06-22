'use client';

import { Fragment, useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useDropzone } from 'react-dropzone';
import {
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface DocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function DocumentUpload({ isOpen, onClose, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/json': ['.json']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const uploadFiles = async () => {
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      
      try {
        // Update status to uploading
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading' as const } : f
        ));

        const formData = new FormData();
        formData.append('file', files[i].file);
        formData.append('title', files[i].file.name);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
          ));
        }, 200);

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${backendUrl}/api/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        });

        clearInterval(progressInterval);

        if (response.ok) {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'success' as const, progress: 100 } : f
          ));
        } else {
          const error = await response.json();
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'error' as const, 
              error: error.error || 'Upload failed' 
            } : f
          ));
        }
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error' as const, 
            error: 'Network error' 
          } : f
        ));
      }
    }
    
    setIsUploading(false);
    
    // If all files uploaded successfully, close after a delay
    const allSuccess = files.every(f => f.status === 'success');
    if (allSuccess) {
      setTimeout(() => {
        onUploadComplete();
        setFiles([]);
      }, 1500);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: 'text-red-400',
      txt: 'text-gray-400',
      md: 'text-green-400',
      docx: 'text-blue-400',
      json: 'text-yellow-400'
    };
    return colors[ext || ''] || 'text-gray-400';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 shadow-2xl transition-all">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Upload Documents
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Dropzone */}
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">
                      {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                      or click to browse
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported: PDF, TXT, MD, DOCX, JSON (max 10MB)
                    </p>
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className="mt-6 space-y-3">
                      {files.map((uploadFile, index) => (
                        <div
                          key={index}
                          className="bg-gray-700/50 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <DocumentTextIcon 
                              className={`w-8 h-8 ${getFileIcon(uploadFile.file)} flex-shrink-0`} 
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-white truncate">
                                    {uploadFile.file.name}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {formatFileSize(uploadFile.file.size)}
                                  </p>
                                </div>
                                {uploadFile.status === 'pending' && (
                                  <button
                                    onClick={() => removeFile(index)}
                                    className="p-1 rounded hover:bg-gray-600"
                                  >
                                    <XMarkIcon className="w-4 h-4 text-gray-400" />
                                  </button>
                                )}
                              </div>

                              {/* Progress/Status */}
                              {uploadFile.status === 'uploading' && (
                                <div className="mt-2">
                                  <div className="bg-gray-600 rounded-full h-1.5">
                                    <div 
                                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${uploadFile.progress}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Uploading... {uploadFile.progress}%
                                  </p>
                                </div>
                              )}
                              
                              {uploadFile.status === 'success' && (
                                <div className="flex items-center gap-2 mt-2">
                                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                                  <p className="text-xs text-green-400">Upload complete</p>
                                </div>
                              )}
                              
                              {uploadFile.status === 'error' && (
                                <div className="flex items-center gap-2 mt-2">
                                  <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
                                  <p className="text-xs text-red-400">{uploadFile.error}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {files.length} {files.length === 1 ? 'file' : 'files'} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={uploadFiles}
                      disabled={files.length === 0 || isUploading}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isUploading ? 'Uploading...' : 'Upload All'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}