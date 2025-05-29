import { CheckIcon, TrashIcon, PencilIcon, UserIcon, CalendarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';
import type { Task } from '../../api/taskApi';
import { format } from 'date-fns';

type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export interface TaskItemProps {
  task: {
    _id: string;
    description: string;
    status: Task['status'];
    priority: Priority;
    assignee?: string | null;
    dueDate?: string | null;
  };
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onEdit?: (id: string, updates: Partial<Task>) => void;
}

const priorityColors: Record<Priority, string> = {
  P1: 'bg-red-100 text-red-800',
  P2: 'bg-yellow-100 text-yellow-800',
  P3: 'bg-blue-100 text-blue-800',
  P4: 'bg-gray-100 text-gray-800',
};

export const TaskItem = ({ task, onDelete, onToggleComplete, onEdit }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({
    description: task.description,
    assignee: task.assignee || '',
    dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea when content changes or editing starts
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to get correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, but not more than 20 lines
      const maxHeight = 20 * parseFloat(getComputedStyle(textarea).lineHeight);
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
    }
  }, [isEditing, editedValues.description]);
  const isCompleted = task.status === 'completed';

  const handleToggleComplete = () => {
    onToggleComplete(task._id);
  };

  const handleDelete = () => {
    onDelete(task._id);
  };

  const handleEditField = (field: 'description' | 'assignee' | 'dueDate') => {
    if (isEditing) {
      // Save changes for the field
      if (onEdit) {
        const updates: Partial<Task> = {};
        
        if (field === 'description' && editedValues.description.trim() !== '') {
          updates.description = editedValues.description;
        } else if (field === 'assignee') {
          updates.assignee = editedValues.assignee || undefined;
        } else if (field === 'dueDate' && editedValues.dueDate) {
          updates.dueDate = editedValues.dueDate;
        }
        
        if (Object.keys(updates).length > 0) {
          onEdit(task._id, updates);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'description' | 'assignee' | 'dueDate') => {
    if (e.key === 'Enter') {
      handleEditField(field);
    } else if (e.key === 'Escape') {
      setEditedValues({
        ...editedValues,
        [field]: field === 'description' ? task.description : 
                 field === 'assignee' ? (task.assignee || '') : 
                 (task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '')
      });
    }
  };

  const handleInputChange = (field: 'description' | 'assignee' | 'dueDate', value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={`flex items-center p-4 border-b border-gray-100 ${isCompleted ? 'opacity-60' : ''}`}>
      <button
        onClick={handleToggleComplete}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors duration-200 ${
          isCompleted 
            ? 'bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600 flex items-center justify-center'
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
        }`}
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
      </button>
      
      <div className="ml-3 flex-grow">
        {/* Description */}
        <div className="mb-1 flex items-start">
          <DocumentTextIcon className="h-4 w-4 mt-1 mr-2 flex-shrink-0 text-gray-400" />
          <div className="flex-grow">
            {isEditing ? (
              <div className="w-full min-w-0">
                <textarea
                  ref={textareaRef}
                  value={editedValues.description}
                  onChange={(e) => {
                    handleInputChange('description', e.target.value);
                    // Force update height on change
                    const textarea = e.target;
                    textarea.style.height = 'auto';
                    const maxHeight = 20 * parseFloat(getComputedStyle(textarea).lineHeight);
                    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
                    textarea.style.height = `${newHeight}px`;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'description')}
                  onBlur={() => handleEditField('description')}
                  autoFocus
                  rows={1}
                  className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    minHeight: '2rem',
                    resize: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: '1.5',
                    fontFamily: 'inherit',
                    fontSize: '0.875rem',
                    overflowY: 'hidden'
                  }}
                />
              </div>
            ) : (
              <div 
                className={`text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'} whitespace-pre-wrap break-words`}
              >
                {task.description}
              </div>
            )}
          </div>
        </div>

        {/* Assignee */}
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <UserIcon className="h-3 w-3 mr-1" />
          {isEditing ? (
            <input
              type="text"
              value={editedValues.assignee}
              onChange={(e) => handleInputChange('assignee', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'assignee')}
              onBlur={() => handleEditField('assignee')}
              placeholder="Add assignee"
              className="ml-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
            />
          ) : (
            <span className="ml-1">
              {task.assignee || 'Unassigned'}
            </span>
          )}
        </div>

        {/* Due Date */}
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <CalendarIcon className="h-3 w-3 mr-1" />
          {isEditing ? (
            <input
              type="date"
              value={editedValues.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'dueDate')}
              onBlur={() => handleEditField('dueDate')}
              className="ml-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <span className="ml-1">
              {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {onEdit && (
          <button
            onClick={() => {
              if (isEditing) {
                // Save all changes and exit edit mode
                handleEditField('description');
                handleEditField('assignee');
                handleEditField('dueDate');
              }
              setIsEditing(!isEditing);
            }}
            className={`p-1 rounded-full ${isEditing ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-500'} transition-colors`}
            aria-label={isEditing ? 'Save changes' : 'Edit task'}
          >
            {isEditing ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <PencilIcon className="w-4 h-4" />
            )}
          </button>
        )}
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete task"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
