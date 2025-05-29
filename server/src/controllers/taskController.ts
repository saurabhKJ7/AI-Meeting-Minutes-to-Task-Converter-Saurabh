import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Task, { ITask } from '../models/Task';
import { parseTasksFromConversation, ParsedTask } from '../utils/nlpParser';
import { extractTextFromBuffer } from '../utils/fileParser';

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter: FileFilterCallback = (req, file, cb) => {
  try {
    const allowedMimeTypes = [
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, XLS, and XLSX files are allowed.');
      console.error('File upload rejected:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        reason: 'Invalid file type'
      });
      cb(error);
    }
  } catch (error) {
    console.error('Error in file filter:', error);
    cb(error as Error);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const createTaskFromParsed = async (parsedTask: ParsedTask) => {
  try {
    if (!parsedTask.description) {
      console.error('Task missing description:', parsedTask);
      return null;
    }

    console.log('Creating task:', {
      description: parsedTask.description,
      assignee: parsedTask.assignee || 'Unassigned',
      dueDate: parsedTask.dueDate || 'No due date',
      priority: parsedTask.priority || 'P3'
    });

    const task = new Task({
      description: parsedTask.description,
      assignee: parsedTask.assignee || '',
      dueDate: parsedTask.dueDate || null,
      priority: parsedTask.priority || 'P3',
      status: 'pending',
      completed: false
    });
    
    const savedTask = await task.save();
    console.log('Successfully created task:', savedTask._id);
    return savedTask;
  } catch (error) {
    console.error('Error creating task from parsed data:', error);
    console.error('Problematic task data:', parsedTask);
    return null;
  }
};

export const createTask = async (req: Request, res: Response) => {
  console.time('Total task creation time');
  
  try {
    console.time('Input processing');
    let text = req.body.text;

    // Handle file upload if present
    if (req.file) {
      console.log('Processing file upload:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        encoding: req.file.encoding
      });

      try {
        console.time('File extraction');
        const extractedText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
        console.timeEnd('File extraction');
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('No text content could be extracted from the file');
        }
        
        console.log('Extracted text from file (first 100 chars):', extractedText.substring(0, 100) + '...');
        text = extractedText;
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error('Error processing file:', {
          error: errorMessage,
          stack: errorStack,
          file: {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          }
        });
        
        return res.status(400).json({ 
          success: false,
          error: 'Error processing file',
          message: `Failed to process file: ${errorMessage}`,
          ...(process.env.NODE_ENV === 'development' ? { stack: errorStack } : {})
        });
      } finally {
        console.timeEnd('Input processing');
      }
    } else {
      console.timeEnd('Input processing');
    }

    if (!text) {
      const errorMsg = 'Text or file is required';
      console.error(errorMsg);
      console.timeEnd('Total task creation time');
      return res.status(400).json({ 
        success: false,
        error: 'Validation Error',
        message: errorMsg
      });
    }

    console.log('Parsing tasks from text (first 200 chars):', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    
    let parsedTasks: any[] = [];
    const maxRetries = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.time('Task parsing');
        console.log(`Parsing attempt ${attempt + 1}/${maxRetries + 1}`);
        const result = await parseTasksFromConversation(text);
        console.timeEnd('Task parsing');
        
        if (!Array.isArray(result) || result.length === 0) {
          throw new Error('No tasks were extracted from the conversation');
        }
        
        // If we get here, parsing was successful
        parsedTasks = result;
        lastError = null;
        break; // Exit the retry loop on success
      } catch (parseError) {
        lastError = parseError instanceof Error ? parseError : new Error(String(parseError));
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt === maxRetries) {
          console.error('Max retries reached, giving up');
        } else {
          // Wait a bit before retrying (exponential backoff)
          const delayMs = 1000 * Math.pow(2, attempt);
          console.log(`Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // If we still have an error after all retries
    if (lastError) {
      console.error('All parsing attempts failed:', lastError);
      console.timeEnd('Total task creation time');
      return res.status(500).json({
        success: false,
        error: 'Failed to process the meeting minutes',
        message: lastError.message,
        ...(process.env.NODE_ENV === 'development' ? { stack: lastError.stack } : {})
      });
    }

    // If we get here, we have valid parsedTasks
    console.log(`Successfully parsed ${parsedTasks.length} tasks`);
    if (process.env.NODE_ENV === 'development') {
      console.debug('Parsed tasks:', JSON.stringify(parsedTasks, null, 2));
    }
    
    // Validate we have tasks to process
    if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) {
      console.timeEnd('Total task creation time');
      return res.status(400).json({
        success: false,
        error: 'No Tasks Found',
        message: 'Could not extract any tasks from the provided content'
      });
    }
    
    // Create tasks in the database
    console.log(`Attempting to create ${parsedTasks.length} tasks...`);
    
    // Process tasks sequentially to better handle errors
    const createdTasks: any[] = [];
    const taskErrors: Array<{taskIndex: number; error: any; taskData?: any}> = [];
    
    console.time('Database operations');
    
    for (let i = 0; i < parsedTasks.length; i++) {
      const task = parsedTasks[i];
      try {
        if (!task || typeof task !== 'object') {
          throw new Error('Invalid task format');
        }
        
        console.time(`Task ${i + 1} creation`);
        console.log(`Creating task ${i + 1}/${parsedTasks.length}:`, {
          description: task.description?.substring(0, 50) + (task.description?.length > 50 ? '...' : ''),
          assignee: task.assignee,
          dueDate: task.dueDate
        });
        
        const createdTask = await createTaskFromParsed(task);
        console.timeEnd(`Task ${i + 1} creation`);
        
        if (createdTask) {
          createdTasks.push(createdTask);
          const desc = createdTask.description || 'No description';
          console.log(`✅ Created task ${i + 1}/${parsedTasks.length}: ${desc.substring(0, 50)}${desc.length > 50 ? '...' : ''}`);
        } else {
          const errorMsg = `Failed to create task ${i + 1}: No task was returned from createTaskFromParsed`;
          console.error(errorMsg);
          taskErrors.push({ 
            taskIndex: i, 
            error: errorMsg,
            taskData: task
          });
        }
      } catch (taskError: unknown) {
        const errorMessage = taskError instanceof Error ? taskError.message : String(taskError);
        const errorStack = taskError instanceof Error ? taskError.stack : undefined;
        
        console.error(`❌ Error creating task ${i + 1}:`, {
          error: errorMessage,
          stack: errorStack,
          taskData: task
        });
        
        taskErrors.push({ 
          taskIndex: i, 
          error: errorMessage,
          taskData: task,
          ...(process.env.NODE_ENV === 'development' ? { stack: errorStack } : {})
        });
      }
    }
    
    console.timeEnd('Database operations');
    
    if (createdTasks.length === 0) {
      throw new Error('No tasks were created successfully');
    }
    
    console.log(`Successfully created ${createdTasks.length} out of ${parsedTasks.length} tasks`);
    if (taskErrors.length > 0) {
      console.warn(`Encountered ${taskErrors.length} errors while processing tasks`);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Task errors:', taskErrors);
      }
    }
    
    console.timeEnd('Total task creation time');
    
    // Prepare response
    const response: Record<string, any> = {
      success: true,
      created: createdTasks.length,
      failed: taskErrors.length,
      total: parsedTasks.length,
      tasks: createdTasks.map(task => ({
        id: task.id,
        description: task.description,
        assignee: task.assignee,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status
      }))
    };
    
    // Add debug info in development
    if (process.env.NODE_ENV === 'development') {
      if (taskErrors.length > 0) {
        response.errors = taskErrors;
      }
      response.debug = {
        processingTime: new Date().toISOString(),
        tasksProcessed: parsedTasks.length
      };
    }
    return res.status(201).json(response);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStack: string | undefined = error instanceof Error ? error.stack : undefined;
    
    console.error('Error in createTask:', errorMessage, errorStack);
    
    // Ensure we're not sending stack traces in production
    const response: Record<string, any> = {
      success: false,
      error: 'Failed to create tasks',
      message: errorMessage
    };
    
    if (process.env.NODE_ENV === 'development') {
      response.stack = errorStack;
    }
    
    return res.status(500).json(response);
  }
};

// Helper to get tasks with filtering
const getTasksWithFilter = async (filter: any = {}) => {
  return await Task.find(filter).sort({ createdAt: -1 });
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { status, source, assignee } = req.query;
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    } else {
      // Default to showing only pending and in-progress tasks if no status is specified
      filter.status = { $in: ['pending', 'in-progress'] };
    }
    
    if (assignee) {
      filter.assignee = assignee;
    }
    
    if (source === 'conversation') {
      filter.source = source;
    }
    
    const tasks = await getTasksWithFilter(filter);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

const getTaskById = async (id: string) => {
  return await Task.findById(id);
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'in-progress', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const task = await getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    task.status = status;
    await task.save();
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const task = await getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    Object.assign(task, updates);
    await task.save();
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await Task.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
