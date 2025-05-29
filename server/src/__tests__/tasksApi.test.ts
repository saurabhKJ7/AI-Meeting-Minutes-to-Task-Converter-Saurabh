import request from 'supertest';
import mongoose, { Document } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Task, { ITask } from '../models/Task';

// First, set up the mock for nlpParser
jest.mock('../utils/nlpParser', () => ({
  parseTaskFromText: jest.fn()
}));

// Then import the mocked module
import { parseTaskFromText } from '../utils/nlpParser';
import OpenAI from 'openai';

// Mock the OpenAI client
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                description: 'Test task',
                assignee: 'testuser',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                priority: 'P3'
              })
            }
          }]
        })
      }
    }
  }));
});

// Create a new Express app for testing
import express from 'express';
import taskRoutes from '../routes/taskRoutes';

const app = express();
app.use(express.json());
app.use('/api/tasks', taskRoutes);

// Extend the Document type to include _id
interface ITaskDocument extends ITask, Document {
  _id: mongoose.Types.ObjectId;
}

// Test data with proper typing
const createTestTask = async (taskData: Partial<ITask> = {}): Promise<ITaskDocument> => {
  const task = await Task.create({
    description: 'Test Task',
    assignee: 'testuser',
    status: 'pending',
    priority: 'P2',
    dueDate: new Date(),
    completed: false,
    ...taskData
  });
  return task as unknown as ITaskDocument;
};

let mongoServer: MongoMemoryServer;

// Mock the MongoDB connection in app.ts to prevent it from connecting to a real database
jest.mock('../app', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Mock routes
  app.use('/api/tasks', require('../routes/taskRoutes'));
  
  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.status(200).json({ status: 'ok' });
  });
  
  return app;
});

// Test data
const mockTask = {
  description: 'Test task',
  assignee: 'testuser',
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  priority: 'P3' as const
};

describe('Tasks API', () => {
  beforeAll(async () => {
    // Start the in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    // Clear all test data after each test
    await Task.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Close the database connection and stop the in-memory server
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      // Mock the parseTaskFromText function to return our mock task
      (parseTaskFromText as jest.Mock).mockResolvedValue({
        description: 'Test task',
        assignee: 'testuser',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'P3',
        completed: false
      });

      const response = await request(app)
        .post('/api/tasks')
        .send({ text: 'Test task' })
        .expect(201);

      expect(response.body).toMatchObject({
        description: mockTask.description,
        assignee: mockTask.assignee,
        priority: mockTask.priority
      });
      // Check that dueDate is a valid date string
      expect(new Date(response.body.dueDate).toString()).not.toBe('Invalid Date');

      // Verify the task was saved to the database
      const task = await Task.findOne({ description: mockTask.description });
      expect(task).not.toBeNull();
      if (task) {
        expect(task.description).toBe(mockTask.description);
        expect(task.assignee).toBe(mockTask.assignee);
        expect(task.priority).toBe(mockTask.priority);
      }
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'Text is required' });
    });

    it('should handle errors from parseTaskFromText', async () => {
      // Mock the parseTaskFromText to throw an error
      (parseTaskFromText as jest.Mock).mockRejectedValueOnce(new Error('Failed to parse task'));

      const response = await request(app)
        .post('/api/tasks')
        .send({ text: 'Invalid task description' })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to create task',
        details: 'Failed to parse task'
      });
    });

    it('should handle errors during task creation', async () => {
      (parseTaskFromText as jest.Mock).mockRejectedValueOnce(new Error('Failed to parse task'));

      const response = await request(app)
        .post('/api/tasks')
        .send({ text: 'Invalid task description' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to create task');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return an empty array when no tasks exist', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      // Create test tasks
      const task1 = await createTestTask({ description: 'Task 1' });
      const task2 = await createTestTask({ description: 'Task 2' });

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      // Verify we got at least the tasks we created
      const taskDescriptions = response.body.map((t: ITask) => t.description);
      expect(taskDescriptions).toContain('Task 1');
      expect(taskDescriptions).toContain('Task 2');
    });

    it('should filter tasks by status', async () => {
      // Create test tasks with different statuses
      await createTestTask({ description: 'Task 1', status: 'pending' });
      await createTestTask({ description: 'Task 2', status: 'in-progress' });
      await createTestTask({ description: 'Task 3', status: 'pending' });

      const response = await request(app)
        .get('/api/tasks?status=pending')
        .expect(200);

      // Verify all returned tasks have the correct status
      expect(response.body.every((task: ITask) => task.status === 'pending')).toBe(true);
    });

    it('should filter tasks by assignee', async () => {
      // Create test tasks with different assignees
      await createTestTask({ description: 'Task 1', assignee: 'user1' });
      await createTestTask({ description: 'Task 2', assignee: 'user2' });
      await createTestTask({ description: 'Task 3', assignee: 'user1' });

      const response = await request(app)
        .get('/api/tasks?assignee=user1')
        .expect(200);

      // Verify all returned tasks have the correct assignee
      expect(response.body.every((task: ITask) => task.assignee === 'user1')).toBe(true);
    });
  });

  describe('GET /api/tasks (task listing)', () => {
    it('should include created tasks in the list', async () => {
      const task = await createTestTask({
        description: 'Test Task',
        assignee: 'testuser',
        status: 'pending',
        priority: 'P2'
      });

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      const foundTask = response.body.find((t: any) => t._id === task._id.toString());
      expect(foundTask).toBeDefined();
      expect(foundTask).toMatchObject({
        description: task.description,
        assignee: task.assignee,
        priority: task.priority
      });
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update a task', async () => {
      // Create a test task
      const task = await createTestTask({
        description: 'Original Task',
        assignee: 'user1',
        status: 'pending',
        priority: 'P3',
        dueDate: new Date()
      });

      const updates = {
        description: 'Updated Task',
        status: 'in-progress',
        priority: 'P1' as const
      };

      const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        _id: task._id.toString(),
        description: 'Updated Task',
        status: 'in-progress',
        priority: 'P1',
        assignee: 'user1'  // Should remain unchanged
      });
    });

    it('should return 404 if task to update is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/tasks/${nonExistentId}`)
        .send({ description: 'Updated Task' })
        .expect(404);

      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      // Create a test task
      const task = await createTestTask({
        description: 'Task to delete',
        assignee: 'user1',
        status: 'pending',
        priority: 'P2',
        dueDate: new Date()
      });

      await request(app)
        .delete(`/api/tasks/${task._id}`)
        .expect(204);

      // Verify the task was deleted
      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    it('should return 404 if task to delete is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/tasks/${nonExistentId}`)
        .expect(404);

      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });
});
