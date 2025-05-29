import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { PlusIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { useTasks } from '../../context/TaskContext';
import { toast } from 'react-hot-toast';

export const TaskForm = () => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addTask, loading } = useTasks();
  const [taskCount, setTaskCount] = useState<number | null>(null);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
      setText(''); // Clear text input when file is selected
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFileType(droppedFile.type)) {
        setFile(droppedFile);
        setFileName(droppedFile.name);
        setText(''); // Clear text input when file is dropped
      }
    }
  };
  
  const isValidFileType = (type: string): boolean => {
    const allowedTypes = [
      // Document types
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return allowedTypes.includes(type);
  };
  
  const removeFile = () => {
    setFile(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!text || text.trim() === '') && !file) {
      toast.error('Please enter a task or upload a file');
      return;
    }
    
    try {
      if (file) {
        // For file uploads, use FormData
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('type', file.type);
        formData.append('size', file.size.toString());
        
        const result = await addTask(formData);
        
        if (result) {
          setText('');
          setFile(null);
          setFileName('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          // Handle the array of tasks
          const taskCount = Array.isArray(result) ? result.length : 1;
          setTaskCount(taskCount);
          
          // Clear the count after 3 seconds
          setTimeout(() => {
            setTaskCount(null);
          }, 3000);
        }
      } else {
        // For text input, use plain object
        const taskData = {
          text: text.trim(),
          // Add other fields if needed
        };
        
        const result = await addTask(taskData);
        
        if (result) {
          setText('');
          
          // Handle the array of tasks
          const taskCount = Array.isArray(result) ? result.length : 1;
          setTaskCount(taskCount);
          
          // Clear the count after 3 seconds
          setTimeout(() => {
            setTaskCount(null);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add task');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Add New Tasks</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <textarea
              rows={3}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value) {
                  setFile(null);
                  setFileName('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }
              }}
              className="block w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 resize-none"
              style={{ minHeight: '100px' }}
              placeholder='Enter conversation text (e.g., "John, please complete the report by Friday. Sarah, follow up with the client tomorrow.")'
              disabled={loading || !!file}
            />
          </div>
        </div>
        
        <div 
          className={`mt-2 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              PDF, DOC, DOCX, TXT, XLS, XLSX up to 5MB
            </p>
          </div>
        </div>
        
        {fileName && (
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
            <div className="flex items-center">
              <PaperClipIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                {fileName}
              </span>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="text-sm font-medium text-red-600 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={(!text.trim() && !file) || loading}
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            {file ? 'Process File' : 'Add Tasks'}
          </button>
        </div>
      </div>
      
      {taskCount !== null && (
        <p className="mt-2 text-sm text-green-600">
          Successfully added {taskCount} task{taskCount !== 1 ? 's' : ''}!
        </p>
      )}
    </form>
  );
};
