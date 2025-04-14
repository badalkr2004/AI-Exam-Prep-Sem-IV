import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import './ExamPaperUploader.css';
import { Upload, Check, X, Loader, Trash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import { mathJaxOptions } from '../utils/mathConfig';

interface FileMetadata {
  title?: string;
  subject?: string;
  year?: string;
}

interface FileWithMetadata {
  file: File;
  metadata: FileMetadata;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

interface ExamPaperUploaderProps {
  onUploadComplete?: () => void;
}

const ExamPaperUploader: React.FC<ExamPaperUploaderProps> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusMessageType, setStatusMessageType] = useState<'info' | 'success' | 'error'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      Array.from(newFiles).forEach(file => {
        // Check if file already exists
        const fileExists = prevFiles.some(f => 
          f.file.name === file.name && 
          f.file.size === file.size && 
          f.file.lastModified === file.lastModified
        );
        
        if (!fileExists && file.type === 'application/pdf') {
          updatedFiles.push({
            file,
            metadata: { 
              title: file.name.replace(/\.pdf$/i, ''), 
              subject: '',
              year: ''
            },
            status: 'pending'
          });
        }
      });
      return updatedFiles;
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const { files } = e.dataTransfer;
    addFiles(files);
  }, [addFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset file input value so the same file can be added again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFiles]);

  const handleFileButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);

  const updateMetadata = useCallback((index: number, field: string, value: string | string[]) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      newFiles[index] = {
        ...newFiles[index],
        metadata: {
          ...newFiles[index].metadata,
          [field]: value
        }
      };
      return newFiles;
    });
  }, []);

  const handleUpload = useCallback(async () => {
    // Check if all required metadata is filled
    const incompleteFiles = files.filter(f => !f.metadata.title)
    
    if (incompleteFiles.length > 0) {
      setStatusMessage('Please fill in all required metadata for each file before uploading.');
      setStatusMessageType('error');
      return;
    }

    setIsUploading(true);
    setStatusMessage('Uploading files...');
    setStatusMessageType('info');

    try {
      // Update status for all files to uploading
      setFiles(prevFiles => 
        prevFiles.map(f => ({
          ...f,
          status: 'uploading',
          message: 'Uploading...'
        }))
      );

      // Process each file upload sequentially
      for (let i = 0; i < files.length; i++) {
        const { file, metadata } = files[i];
        
        // Skip already uploaded files
        if (files[i].status === 'success') continue;
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('title', JSON.stringify(metadata.title));
          formData.append('subject', JSON.stringify(metadata.subject));
          formData.append('year', JSON.stringify(metadata.year));
          

          await axios.post('https://ai-backend.bitbrains.fun/exam/upload', formData);
          
          // Update status for this file
          setFiles(prevFiles => {
            const newFiles = [...prevFiles];
            newFiles[i] = {
              ...newFiles[i],
              status: 'success',
              message: 'Successfully uploaded!'
            };
            return newFiles;
          });
          
        } catch (err) {
          // Update status for this file
          setFiles(prevFiles => {
            const newFiles = [...prevFiles];
            newFiles[i] = {
              ...newFiles[i],
              status: 'error',
              message: err instanceof Error ? err.message : 'Upload failed'
            };
            return newFiles;
          });
        }
      }
      
      // Check if all files were uploaded successfully
      const allSuccess = files.every(f => f.status === 'success');
      if (allSuccess) {
        setStatusMessage('All files uploaded successfully! $\\checkmark$');
        setStatusMessageType('success');
        // Call the onUploadComplete callback if provided
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setStatusMessage('Some files failed to upload. Please check and try again.');
        setStatusMessageType('error');
      }
      
    } catch (err) {
      setStatusMessage(err instanceof Error ? `Error: ${err.message}` : 'An unexpected error occurred');
      setStatusMessageType('error');
    } finally {
      setIsUploading(false);
    }
  }, [files, onUploadComplete]);

  return (
    <div className="uploader-container">
      <h2>Upload Exam Papers</h2>
      
      <div 
        className={`drop-zone ${isDragging ? 'active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload size={48} className='mx-auto' color="#4F46E5" />
        <p>Drag & drop PDF files here or</p>
        <button type="button" onClick={handleFileButtonClick} className="file-button">
          Select Files
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          multiple
          accept=".pdf"
        />
      </div>
      
      {files.length > 0 && (
        <div className="files-container">
          <h3>Selected Files</h3>
          <ul className="file-list">
            {files.map((fileItem, index) => (
              <li key={index} className={`file-item ${fileItem.status}`}>
                <div className="file-info">
                  <div className="file-name">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
                    >
                      {fileItem.file.name}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="metadata-fields">
                    <div className="metadata-field">
                      <label htmlFor={`school-${index}`}>Title*:</label>
                      <input
                        id={`title-${index}`}
                        type="text"
                        value={fileItem.metadata.title}
                        onChange={(e) => updateMetadata(index, 'title', e.target.value)}
                        placeholder="Enter title"
                        required
                      />
                    </div>

                    <div className="metadata-field">
                      <label htmlFor={`subject-${index}`}>Subject*:</label>
                      <input
                        id={`subject-${index}`}
                        type="text"
                        value={fileItem.metadata.subject || ''}
                        onChange={(e) => updateMetadata(index, 'subject', e.target.value)}
                        placeholder="e.g. Mathematics, Physics"
                      />
                    </div>

                   

                 

                    <div className="metadata-field">
                      <label htmlFor={`year-${index}`}>Year:</label>
                      <input
                        id={`year-${index}`}
                        type="text"
                        value={fileItem.metadata.year || ''}
                        onChange={(e) => updateMetadata(index, 'year', e.target.value)}
                        placeholder="e.g. 2023"
                      />
                    </div>
                  </div>
                </div>

                <div className="file-actions">
                  {fileItem.status === 'success' && <Check size={18} color="green" />}
                  {fileItem.status === 'error' && <X size={18} color="red" />}
                  {fileItem.status === 'uploading' && <Loader size={18} color="blue" className='spin-in' />}
                  
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    className="remove-button"
                    disabled={isUploading}
                  >
                    <Trash />
                  </button>
                </div>
                
                {fileItem.message && (
                  <div className={`file-message ${fileItem.status}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
                    >
                      {fileItem.message}
                    </ReactMarkdown>
                  </div>
                )}
              </li>
            ))}
          </ul>
          
          <div className="upload-actions">
            <button 
              type="button" 
              onClick={handleUpload} 
              className="upload-button"
              disabled={isUploading || files.length === 0}
            >
              {isUploading ? 'Uploading...' : 'Upload All Files'}
            </button>
            
            {statusMessage && (
              <div className={`status-message ${statusMessageType}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
                >
                  {statusMessage}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPaperUploader; 