const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve built frontend
app.use(express.static('dist'));

// Project storage directory
const PROJECTS_DIR = path.join(__dirname, '../projects');
fs.ensureDirSync(PROJECTS_DIR);

// Claude Code SDK interface
class ClaudeCodeSDK {
  constructor() {
    this.currentProject = null;
    this.projectPath = null;
  }

  async createProject(name, description) {
    console.log('🎯 Creating new project with Claude Code SDK...');
    
    // Create project directory
    this.projectPath = path.join(PROJECTS_DIR, name.replace(/[^a-zA-Z0-9]/g, '-'));
    await fs.ensureDir(this.projectPath);
    
    // Initialize with Claude Code
    return new Promise((resolve, reject) => {
      const claudeProcess = spawn('claude', ['/init'], {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      claudeProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Claude Code:', data.toString());
      });

      claudeProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error('Claude Code Error:', data.toString());
      });

      claudeProcess.on('close', async (code) => {
        if (code === 0) {
          // Send initial prompt to Claude Code
          await this.sendPrompt(`Create a ${description}. Set up the complete project structure with all necessary files.`);
          resolve({ success: true, output, path: this.projectPath });
        } else {
          reject(new Error(`Claude Code failed with code ${code}: ${error}`));
        }
      });
    });
  }

  async sendPrompt(message) {
    if (!this.projectPath) {
      throw new Error('No active project');
    }

    console.log('💬 Sending prompt to Claude Code:', message);

    return new Promise((resolve, reject) => {
      const claudeProcess = spawn('claude', ['chat', message], {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      claudeProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Claude Code Response:', data.toString());
      });

      claudeProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      claudeProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ output, files: this.getProjectFiles() });
        } else {
          reject(new Error(`Claude Code failed: ${error}`));
        }
      });
    });
  }

  async getProjectFiles() {
    if (!this.projectPath) return [];

    const files = [];
    const readDir = async (dir, relativePath = '') => {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory() && !item.startsWith('.')) {
          await readDir(fullPath, itemRelativePath);
        } else if (stats.isFile() && this.isTextFile(item)) {
          const content = await fs.readFile(fullPath, 'utf8');
          files.push({
            id: Date.now() + Math.random(),
            name: item,
            path: itemRelativePath,
            content,
            language: this.getLanguage(item)
          });
        }
      }
    };

    await readDir(this.projectPath);
    return files;
  }

  isTextFile(filename) {
    const textExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md', '.txt', '.yml', '.yaml'];
    return textExtensions.some(ext => filename.endsWith(ext));
  }

  getLanguage(filename) {
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    return 'text';
  }

  async saveFile(filePath, content) {
    const fullPath = path.join(this.projectPath, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
    return true;
  }
}

const claudeSDK = new ClaudeCodeSDK();

// API Routes
app.post('/api/create-project', async (req, res) => {
  try {
    const { name, description } = req.body;
    console.log(`🚀 Creating project: ${name}`);
    
    const result = await claudeSDK.createProject(name, description);
    const files = await claudeSDK.getProjectFiles();
    
    res.json({ 
      success: true, 
      message: 'Project created with Claude Code SDK',
      files,
      projectPath: result.path 
    });
  } catch (error) {
    console.error('Project creation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      suggestion: 'Make sure Claude Code CLI is installed: npm install -g @anthropic-ai/claude-code'
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log(`💬 Chat message: ${message}`);
    
    const result = await claudeSDK.sendPrompt(message);
    const files = await claudeSDK.getProjectFiles();
    
    res.json({ 
      success: true, 
      response: result.output,
      files 
    });
  } catch (error) {
    console.error('Chat failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/save-file', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    await claudeSDK.saveFile(filePath, content);
    res.json({ success: true });
  } catch (error) {
    console.error('File save failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const files = await claudeSDK.getProjectFiles();
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  // Check if Claude Code CLI is available
  exec('claude --version', (error, stdout, stderr) => {
    if (error) {
      res.json({ 
        status: 'error', 
        claudeCode: false,
        message: 'Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code'
      });
    } else {
      res.json({ 
        status: 'ok', 
        claudeCode: true, 
        version: stdout.trim() 
      });
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Claude Code Builder server running on port ${port}`);
  console.log('🔍 Checking Claude Code CLI availability...');
  
  exec('claude --version', (error, stdout) => {
    if (error) {
      console.log('❌ Claude Code CLI not found');
      console.log('📥 Install with: npm install -g @anthropic-ai/claude-code');
    } else {
      console.log(`✅ Claude Code CLI found: ${stdout.trim()}`);
    }
  });
});