import { useState } from 'react';
import { TaskItem } from '../TaskItem/TaskItem';
import { useTasks } from '../../context/TaskContext';
import type { Task } from '../../api/taskApi';

type TabType = 'in-progress' | 'completed';

const tabConfig = [
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
] as const;

export const TaskList = () => {
  const [activeTab, setActiveTab] = useState<TabType>('in-progress');
  const { tasks, deleteTask, updateTask } = useTasks();
  
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'completed') {
      return task.status === 'completed';
    }
    return task.status !== 'completed';
  });
  
  const handleToggleComplete = (id: string) => {
    const task = tasks.find(t => t._id === id);
    if (task) {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      updateTask(id, { status: newStatus });
    }
  };
  
  const handleDelete = async (id: string) => {
    await deleteTask(id);
  };
  
  const handleEdit = async (id: string, updates: Partial<Task>) => {
    await updateTask(id, updates);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabConfig.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {filteredTasks.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No {activeTab === 'completed' ? 'completed' : 'in-progress'} tasks found
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <TaskItem
              key={task._id}
              task={{
                ...task,
                status: task.status,
              }}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEdit}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
