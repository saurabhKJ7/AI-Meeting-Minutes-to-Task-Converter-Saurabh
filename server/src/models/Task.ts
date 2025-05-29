import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITask extends Document {
  description: string;
  assignee?: string;
  dueDate?: Date;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'pending' | 'in-progress' | 'completed' | 'archived';
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    assignee: {
      type: String,
      required: false,
      trim: true,
      default: 'Unassigned'
    },
    dueDate: {
      type: Date,
      required: false,
    },
    priority: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      default: 'P3',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'archived'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the Task model
export default mongoose.model<ITask>('Task', taskSchema, 'tasks');
