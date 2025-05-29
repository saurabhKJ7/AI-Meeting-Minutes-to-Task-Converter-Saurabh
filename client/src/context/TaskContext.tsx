import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getTasks, createTask as createTaskApi, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from '../api/taskApi';
import type { Task } from '../api/taskApi';
import { toast } from 'react-hot-toast';

interface TaskFormData {
  text: string;
  file?: File;
  assignee?: string;
  dueDate?: Date;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
}

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (taskData: TaskFormData | FormData, isConversation?: boolean) => Promise<any>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  fetchTasks: (status?: string, source?: 'single' | 'conversation') => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (status?: string, source?: 'single' | 'conversation') => {
    try {
      setLoading(true);
      const data = await getTasks(status, source);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = useCallback(async (taskData: TaskFormData | FormData) => {
    try {
      setLoading(true);
      
      let result;
      
      if (taskData instanceof FormData) {
        // Handle file upload
        result = await createTaskApi(taskData, true);
      } else if (typeof taskData === 'object' && 'text' in taskData) {
        // Handle TaskFormData
        const { text, assignee, dueDate, priority } = taskData;
        const taskPayload = {
          text,
          ...(assignee && { assignee }),
          ...(dueDate && { dueDate: dueDate.toISOString().split('T')[0] }),
          ...(priority && { priority })
        };
        
        result = await createTaskApi(taskPayload);
      } else {
        // Handle string input (for backward compatibility)
        const taskText = taskData as string;
        result = await createTaskApi(taskText);
      }
      
      // Always handle as array of tasks
      const newTasks = Array.isArray(result) ? result : [result];
      
      setTasks(prevTasks => [...newTasks, ...prevTasks]);
      
      // Show success message with count of tasks added
      const taskCount = newTasks.length;
      toast.success(`Successfully added ${taskCount} task${taskCount > 1 ? 's' : ''}`);
      
      // Refetch tasks to ensure we have the latest data
      fetchTasks();
      
      return result;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  const toggleTask = async (id: string) => {
    try {
      const task = tasks.find(t => t._id === id);
      if (task) {
        const updatedTask = await updateTaskApi(id, { completed: !task.completed });
        setTasks(tasks.map(t => (t._id === id ? updatedTask : t)));
      }
    } catch (err) {
      setError('Failed to update task');
      console.error('Error toggling task:', err);
    }
  };

  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<void> => {
    try {
      const updatedTask = await updateTaskApi(id, updates);
      setTasks(prevTasks => prevTasks.map(task => (task._id === id ? updatedTask : task)));
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await deleteTaskApi(id);
      setTasks(prevTasks => prevTasks.filter(task => task._id !== id));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error;
    }
  }, []);

  const value = {
    tasks,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    fetchTasks,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
