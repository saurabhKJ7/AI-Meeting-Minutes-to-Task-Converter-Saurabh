import { Router, Request, Response, NextFunction } from 'express';
import * as taskController from '../controllers/taskController';
import { upload } from '../controllers/taskController';

const router = Router();

// Create a new task from natural language or file upload
router.post('/', 
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    taskController.createTask(req, res).catch(next);
  }
);

// Get all tasks
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  taskController.getTasks(req, res).catch(next);
});

// Update a task
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  taskController.updateTask(req, res).catch(next);
});

// Update task status
router.patch('/:id/status', (req: Request, res: Response, next: NextFunction) => {
  taskController.updateTaskStatus(req, res).catch(next);
});

// Delete a task
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  taskController.deleteTask(req, res).catch(next);
});

export default router;
