# Claude Code SDK Builder

A professional web interface for Claude Code SDK - the proper way to build with Claude AI.

## Features

- **Real Claude Code CLI integration** - Uses the actual Claude Code SDK, not just API calls
- **Professional project generation** - Creates complete project structures
- **Live preview** - See your apps running in real-time
- **File management** - Edit and save files with auto-sync
- **Claude Code chat** - Interactive development with Claude Code
- **Resizable interface** - Drag to resize editor and preview panes

## Setup Instructions

### 1. Install Claude Code CLI

First, install the official Claude Code CLI:

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Set up this project

```bash
# Clone or create the project directory
mkdir claude-code-builder
cd claude-code-builder

# Copy all the provided files into the directory

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. Configure Claude Code

Make sure Claude Code is configured with your API key:

```bash
claude configure
```

Follow the prompts to set up your Anthropic API key.

### 4. Start building!

1. Open http://localhost:5173
2. Enter a project name and description
3. Click "Create with Claude Code SDK"
4. Watch Claude Code generate a complete project
5. Edit code and see changes in real-time
6. Chat with Claude Code for improvements

## How it works

This application provides a web interface for the Claude Code CLI. When you create a project:

1. **Backend spawns Claude Code CLI** in a project directory
2. **Claude Code generates** the complete project structure
3. **Frontend displays** all generated files
4. **Live preview** shows your app running
5. **Chat interface** lets you request changes via Claude Code
6. **File watching** keeps everything in sync

## Why this approach?

- ✅ **Uses actual Claude Code SDK** - Not just API calls
- ✅ **Professional project structure** - Claude Code knows best practices
- ✅ **Real-time collaboration** - Chat with Claude about your code
- ✅ **Full file management** - Complete project development
- ✅ **Live preview** - See your app as you build it
- ✅ **No platform lock-in** - Your projects are standard code

This gives you the power of Claude Code with the convenience of a web interface!

// ================================
// SETUP CHECKLIST:
// ================================

/*
BEFORE RUNNING:

1. Install Claude Code CLI globally:
   npm install -g @anthropic-ai/claude-code

2. Configure Claude Code with your API key:
   claude configure

3. Create project directory and add all files

4. Install dependencies:
   npm install

5. Start the application:
   npm run dev

6. Open http://localhost:5173

7. Create projects using the real Claude Code SDK!
