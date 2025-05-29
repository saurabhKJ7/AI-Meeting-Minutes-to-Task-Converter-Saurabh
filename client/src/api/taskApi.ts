import axios from 'axios';

const API_URL = 'http://localhost:5000/api/tasks';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'archived';

export interface Task {
  _id: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: TaskStatus;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  text: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
}

export const createTask = async (
  taskData: CreateTaskData | string | FormData, 
  isFileUpload: boolean = false
): Promise<Task | Task[]> => {
  let response;
  
  if (isFileUpload) {
    // For file uploads, send as FormData
    response = await axios.post(API_URL, taskData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } else {
    // For regular text input
    const payload = typeof taskData === 'string' 
      ? { text: taskData }
      : taskData;
      
    response = await axios.post(API_URL, payload);
  }
  
  return response.data;
};

export const getTasks = async (status?: string, source?: 'single' | 'conversation'): Promise<Task[]> => {
  const params: any = {};
  if (status) params.status = status;
  if (source) params.source = source;
  
  const response = await axios.get(API_URL, { params });
  return response.data;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const response = await axios.put(`${API_URL}/${id}`, updates);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};
