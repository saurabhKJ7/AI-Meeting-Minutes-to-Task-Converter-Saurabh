import { TaskProvider } from './context/TaskContext';
import { TaskForm } from './components/TaskForm/TaskForm';
import { TaskList } from './components/TaskList/TaskList';

export const App = () => {
  return (
    <TaskProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Natural Language Task Manager
              </h1>
              <p className="mt-3 text-xl text-gray-500">
                Add tasks using natural language like "Call John tomorrow at 2pm"
              </p>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <TaskForm />
                <div className="mt-8">
                  <TaskList />
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Created with React, TypeScript, Tailwind CSS, and Node.js</p>
            </div>
          </div>
        </div>
      </div>
    </TaskProvider>
  );
};

export default App;
