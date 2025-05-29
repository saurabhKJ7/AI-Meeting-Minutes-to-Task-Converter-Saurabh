import OpenAI from 'openai';
import { format, addDays } from 'date-fns';

const TIME_ZONE = 'Asia/Kolkata';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  dangerouslyAllowBrowser: false,
});

export interface ParsedTask {
  description: string;
  assignee: string;
  dueDate: string; // ISO string
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

/**
 * Parses a conversation text and extracts tasks with assignees and due dates
 * @param conversationText The conversation text containing task assignments
 * @returns Array of parsed tasks
 */
export async function parseTasksFromConversation(conversationText: string): Promise<ParsedTask[]> {
  const currentDate = new Date();
  const today = format(currentDate, 'yyyy-MM-dd');
  const tomorrow = format(addDays(currentDate, 1), 'yyyy-MM-dd');
  
  // Calculate next Friday
  const daysUntilFriday = (5 - currentDate.getDay() + 7) % 7 || 7;
  const nextFriday = addDays(currentDate, daysUntilFriday);
  const friday = format(nextFriday, 'yyyy-MM-dd');

  // Configuration for the OpenAI API
  const openAIConfig = {
    model: 'gpt-3.5-turbo' as const,
    temperature: 0.1,
    maxTokens: 1000, // Control the maximum number of tokens in the response
    responseFormat: { type: 'json_object' as const },
    timeout: 30000 // 30 seconds timeout
  };

  const systemPrompt = `Extract action items from meeting minutes into a JSON array of task objects with these fields:
- description: String (5-8 words, start with verb)
- assignee: String (name or empty)
- dueDate: String (ISO date or empty)
- priority: "P1"|"P2"|"P3"|"P4" (default: "P3")

PRIORITIES:
- P1: Urgent (today)
- P2: High (tomorrow)
- P3: Normal (this week)
- P4: Low (when possible)

RULES:
1. Extract ALL tasks, one per item in lists or action items
2. Keep descriptions concise and action-oriented
3. Extract assignees from "[Name] to [task]" or "[Name] will [task]"
4. Convert relative dates to ISO format (e.g., "tomorrow" -> date)
5. If unsure about priority, use P3

RESPONSE FORMAT: { "tasks": [...] }`;

  try {
    console.time('OpenAI API call');
    
    // Truncate the input if it's too long to save tokens
    const MAX_INPUT_TOKENS = 3000; // Rough estimate to leave room for response
    const truncatedText = conversationText.length > MAX_INPUT_TOKENS 
      ? conversationText.substring(0, MAX_INPUT_TOKENS) + '... [truncated]' 
      : conversationText;
    
    const userPrompt = `Extract tasks from these meeting minutes. Be thorough but concise.\n\n${truncatedText}`;
    
    interface OpenAIResponse {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
      usage?: {
        total_tokens: number;
      };
    }

    const response = await Promise.race([
      (async (): Promise<OpenAIResponse> => {
        try {
          const completion = await openai.chat.completions.create({
            model: openAIConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: openAIConfig.temperature,
            max_tokens: openAIConfig.maxTokens,
            response_format: openAIConfig.responseFormat
          });
          return completion as unknown as OpenAIResponse;
        } catch (error) {
          console.error('OpenAI API error:', error);
          throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      })(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), openAIConfig.timeout)
      )
    ]);
    
    console.timeEnd('OpenAI API call');
    
    if (response.usage?.total_tokens) {
      console.log(`Tokens used: ${response.usage.total_tokens}`);
    } else {
      console.warn('No token usage information available');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    console.log('Raw AI response:');
    console.log(content);
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse JSON response:', content);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Handle different response formats
    let tasks = [];
    if (Array.isArray(result)) {
      tasks = result;
    } else if (result && Array.isArray(result.tasks)) {
      tasks = result.tasks;
    } else if (result && result.tasks && Array.isArray(result.tasks)) {
      tasks = result.tasks;
    } else if (result && result.description) {
      tasks = [result];
    } else if (typeof result === 'object' && result !== null) {
      // Check for any array property that might contain tasks
      const arrayProps = Object.values(result).filter(Array.isArray);
      if (arrayProps.length > 0) {
        tasks = arrayProps.flat();
      } else {
        // If no array found but we have an object, try to convert it to a task
        tasks = Object.values(result).filter(v => v && typeof v === 'object');
        if (tasks.length === 0) {
          tasks = [result];
        }
      }
    }
    
    console.log('Extracted tasks:', JSON.stringify(tasks, null, 2));
    
    // Ensure we have valid tasks
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.error('No valid tasks found in response:', result);
      throw new Error('No valid tasks could be extracted from the conversation');
    }
    
    // Process and validate each task
    const processedTasks = [];
    for (const task of tasks) {
      try {
        if (!task) continue;
        
        // Handle case where task might be a string
        let taskObj = typeof task === 'string' ? { description: task } : task;
        
        // If task is an object with a 'task' property, use that
        if (taskObj && typeof taskObj === 'object' && taskObj.task) {
          taskObj = taskObj.task;
        }
        
        // If we still don't have a description, try to find one in the object
        if (!taskObj.description) {
          // Look for common description fields
          const possibleDescriptionFields = ['task', 'action', 'item', 'todo', 'description'];
          for (const field of possibleDescriptionFields) {
            if (taskObj[field] && typeof taskObj[field] === 'string') {
              taskObj.description = taskObj[field];
              break;
            }
          }
        }
        
        if (!taskObj.description) {
          console.warn('Task missing description, skipping:', taskObj);
          continue;
        }
        
        // Clean up the description
        let description = String(taskObj.description).trim();
        
        // Remove numbering if present (e.g., "1. " or "1) ")
        description = description.replace(/^\d+[.)]\s*/, '');
        
        // Extract assignee from description if not already set
        let assignee = '';
        
        // First try to get assignee from the task object
        if (taskObj.assignee && typeof taskObj.assignee === 'string') {
          assignee = taskObj.assignee.trim();
        } else if (taskObj.assignedTo) {
          assignee = String(taskObj.assignedTo).trim();
        } else if (taskObj.owner) {
          assignee = String(taskObj.owner).trim();
        }
        
        // If still no assignee, try to extract from description
        if (!assignee) {
          // Try to extract assignee from description (e.g., "John to complete...")
          const assigneeMatch = description.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+to\s+|\s+will\s+)/i);
          if (assigneeMatch) {
            assignee = assigneeMatch[1].trim();
            // Remove the assignee from the description
            description = description.substring(assigneeMatch[0].length).trim();
          }
        }
        
        // Process due date if present
        let dueDate = '';
        const dueDateFields = ['dueDate', 'due_date', 'due', 'date', 'deadline'];
        
        for (const field of dueDateFields) {
          if (taskObj[field]) {
            try {
              const date = new Date(taskObj[field]);
              if (!isNaN(date.getTime())) {
                dueDate = date.toISOString();
                break;
              }
            } catch (e) {
              console.warn(`Invalid date format in field ${field}:`, taskObj[field]);
            }
          }
        }
        
        // Process priority
        let priority = 'P3'; // Default priority
        const priorityFields = ['priority', 'importance', 'severity'];
        
        for (const field of priorityFields) {
          if (taskObj[field]) {
            const p = String(taskObj[field]).toUpperCase();
            if (p.startsWith('P') && ['P1', 'P2', 'P3', 'P4'].includes(p)) {
              priority = p;
              break;
            } else if (['HIGH', 'MEDIUM', 'LOW'].includes(p)) {
              priority = p === 'HIGH' ? 'P1' : p === 'MEDIUM' ? 'P2' : 'P4';
              break;
            } else if (['URGENT', 'IMPORTANT', 'NORMAL', 'LOW'].includes(p)) {
              priority = p === 'URGENT' ? 'P1' : p === 'IMPORTANT' ? 'P2' : p === 'NORMAL' ? 'P3' : 'P4';
              break;
            }
          }
        }
        
        // If description is too long, truncate it
        if (description.length > 500) {
          description = description.substring(0, 497) + '...';
        }
        
        processedTasks.push({
          description,
          assignee,
          dueDate,
          priority
        });
      } catch (e) {
        console.error('Error processing task, skipping:', task);
        console.error('Error details:', e);
      }
    }
    
    if (processedTasks.length === 0) {
      throw new Error('No valid tasks could be extracted after processing');
    }
    
    console.log('Processed tasks:', JSON.stringify(processedTasks, null, 2));
    return processedTasks;
  } catch (error) {
    console.error('Error in parseTasksFromConversation:', error);
    throw new Error(`Failed to parse tasks from conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
