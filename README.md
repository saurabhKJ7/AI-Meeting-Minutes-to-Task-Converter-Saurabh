# AI Meeting Minutes to Task Converter

A powerful application that converts meeting minutes and conversations into structured tasks using AI-powered parsing. Automatically extracts action items, assignees, due dates, and priorities from your meeting notes.

## ✨ Features

- **Natural Language Processing**: Add tasks using everyday language or upload meeting minutes
- **Smart Task Extraction**: AI automatically identifies:
  - Task description (concise format)
  - Assignee (person or team)
  - Due dates and times
  - Priority levels (P1-P4)
- **File Upload Support**: Upload meeting minutes in various formats (PDF, DOCX, TXT, etc.)
- **Drag & Drop Interface**: Intuitive file upload with drag and drop support
- **Real-time Validation**: Instant feedback on task creation
- **Responsive Design**: Works on all devices
- **Modern UI**: Clean, intuitive interface with Tailwind CSS
- **Type Safety**: Full TypeScript support for better development experience
- **Error Handling**: Comprehensive error handling and user feedback

## Video Demo

https://github.com/saurabhKJ7/AI-Meeting-Minutes-to-Task-Converter-Saurabh/raw/main/assets/videos/demo.mov


<video src="assets/videos/demo.mov" controls width="640" height="360">
  Your browser does not support the video tag.
  You can download the video <a href="assets/videos/demo.mov">here</a> instead.
</video>

## 📋 Example Usage

### Input Text
```
Good morning everyone. Let's review our action items from today's meeting. 

Raj, please handle the client follow-up by Wednesday. The client seemed interested in our new features.

Shreya, could you review the marketing deck tonight? We need your feedback before the presentation.

Sarah, take care of the budget analysis by end of week. Let's make this P2 priority since it's important but not urgent.
```

### Expected Output

Here's how the tasks appear in the application:

```
✅ Review action items from meeting
   Today 5:00 PM • Team • P3

🔄 Follow up with client about new features
   Wednesday EOD • Raj • P2

🔄 Review marketing deck for presentation
   Tonight 11:59 PM • Shreya • P2

🔄 Complete budget analysis report
   Friday EOD • Sarah • P2
```

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB with Mongoose
- **File Processing**: multer, pdf-parse, mammoth
- **NLP**: Custom parser for task extraction
- **UI Components**: Headless UI, Hero Icons
- **Build Tool**: Vite
- **State Management**: React Context API
- **Form Handling**: React Hook Form
- **Notifications**: React Hot Toast

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-task-manager.git
   cd ai-task-manager
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

4. Create a `.env` file in the server directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   NODE_ENV=development
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd client
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.



### Create a Task

```http
POST /api/tasks
Content-Type: application/json

{
  "text": "Complete the project by Friday",
  "assignee": "John Doe",
  "dueDate": "2023-12-31",
  "priority": "P2"
}
```

### Upload Meeting Minutes File

```http
POST /api/tasks
Content-Type: multipart/form-data

# Include a file in the 'file' field
```

### Get All Tasks

```http
GET /api/tasks
```

### Filter Tasks

```http
GET /api/tasks?status=completed&assignee=John
```

### Update Task

```http
PATCH /api/tasks/:id
Content-Type: application/json

{
  "status": "completed",
  "priority": "P1"
}
```

### Delete a Task

```http
DELETE /api/tasks/:id
```

## 🧪 Testing

Run the test suite:

```bash
# In the server directory
npm test

# In the client directory
npm test
```



## 💡 Usage Examples

### Adding Tasks

Use natural language to add tasks. The AI will automatically extract:

```
"Team meeting tomorrow at 11am about project timeline"
→ Description: "Schedule team meeting for project timeline"
→ Due: Tomorrow at 11:00 AM
→ Assignee: Team
```

```
"Aman, review PR #42 by EOD P1"
→ Description: "Review pull request #42 changes"
→ Assignee: Aman
→ Priority: P1 (Urgent)
→ Due: Today at 5:00 PM
```

### Task Management

- ✅ **Complete**: Click the checkbox
- ✏️ **Edit**: Click the edit icon
- 🗑️ **Delete**: Click the trash icon
- 🔄 **Refresh**: Tasks auto-save and sync



## 🏗 Project Structure

```
├── client/                 # Frontend application
│   ├── public/            # Static assets
│   └── src/
│       ├── api/           # API service layer
│       ├── components/     # Reusable UI components
│       ├── context/        # Global state management
│       ├── hooks/          # Custom React hooks
│       ├── types/          # TypeScript type definitions
│       └── App.tsx         # Root component
│
├── server/                # Backend application
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Helper functions
│   │   └── app.ts        # Express app setup
│   └── test/             # Test files
│
├── .github/              # GitHub workflows
├── .husky/               # Git hooks
└── .vscode/              # VS Code settings


### Backend (server/.env)

- `PORT`: Port number for the backend server (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `OPENAI_API_KEY`: Your OpenAI API key for natural language processing


