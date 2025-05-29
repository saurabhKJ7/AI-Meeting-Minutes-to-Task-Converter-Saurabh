// Mock the OpenAI module
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

// Import the module after setting up the mock
import { parseTaskFromText } from '../utils/nlpParser';

describe('parseTaskFromText', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should parse a simple task without assignee or due date', async () => {
    // Mock the OpenAI response
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            description: 'Review login bug',
            assignee: 'me',
            dueDate: new Date(Date.now() + 3600000).toISOString(),
            priority: 'P3'
          })
        }
      }]
    });

    const result = await parseTaskFromText('Review login bug');
    
    expect(result).toEqual({
      description: 'Review login bug',
      assignee: 'me',
      dueDate: expect.any(String),
      priority: 'P3'
    });
  });

  it('should parse a task with assignee and time', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    // Mock the OpenAI response
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            description: 'Deploy site',
            assignee: 'Aman',
            dueDate: tomorrow.toISOString(),
            priority: 'P3'
          })
        }
      }]
    });

    const result = await parseTaskFromText('Aman, deploy site by 6pm');
    
    expect(result).toEqual({
      description: 'Deploy site',
      assignee: 'Aman',
      dueDate: expect.any(String),
      priority: 'P3'
    });
  });

  it('should handle invalid JSON response from OpenAI', async () => {
    // Mock an invalid JSON response
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: 'invalid json'
        }
      }]
    });

    await expect(parseTaskFromText('Invalid task')).rejects.toThrow('is not valid JSON');
  });

  it('should handle missing response from OpenAI', async () => {
    // Mock empty response
    mockCreate.mockResolvedValueOnce({
      choices: [{}]
    });

    await expect(parseTaskFromText('Empty task')).rejects.toThrow('No response from OpenAI');
  });
});
