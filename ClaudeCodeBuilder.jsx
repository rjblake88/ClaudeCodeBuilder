import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, ArrowRight, CheckCircle, XCircle, FileText, FolderOpen, 
  MessageSquare, Code, Terminal, Send, Sparkles, RefreshCw, 
  Zap, Globe, Database, Download, X, AlertCircle
} from 'lucide-react';

const ClaudeCodeBuilder = () => {
  const [currentStep, setCurrentStep] = useState('input');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [output, setOutput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [showConsole, setShowConsole] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(50);
  const [claudeCodeStatus, setClaudeCodeStatus] = useState(null);
  
  const chatEndRef = useRef(null);
  const activeFile = files.find(f => f.id === activeFileId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    checkClaudeCodeStatus();
  }, []);

  const checkClaudeCodeStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const status = await response.json();
      setClaudeCodeStatus(status);
      
      if (status.claudeCode) {
        setOutput(`✅ Claude Code SDK ready!\nVersion: ${status.version}\n\n🚀 Ready to build amazing projects with Claude Code SDK!`);
      } else {
        setOutput(`❌ Claude Code CLI not found\n\n📥 Please install Claude Code CLI first:\nnpm install -g @anthropic-ai/claude-code\n\nThen restart this application.`);
      }
    } catch (error) {
      setOutput(`❌ Server connection failed\n\nMake sure the backend server is running:\nnpm run server`);
    }
  };

  const createProject = async () => {
    if (!projectName.trim() || !projectDescription.trim()) {
      alert('Please enter both project name and description');
      return;
    }

    setIsBuilding(true);
    setCurrentStep('building');
    setOutput('🎯 Creating project with Claude Code SDK...\n');

    try {
      const response = await fetch('/api/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: projectName, 
          description: projectDescription 
        })
      });

      const result = await response.json();

      if (result.success) {
        setFiles(result.files);
        setActiveFileId(result.files[0]?.id);
        setCurrentStep('complete');
        setOutput(prev => prev + `✅ Project created successfully!\n📁 Files generated: ${result.files.length}\n🎯 Project ready for development!\n\nYou can now:\n- Edit files in the code editor\n- Preview your app in real-time\n- Chat with Claude Code for improvements`);
        setChatMessages([{
          role: 'assistant',
          content: `🎉 Your ${projectName} project is ready! Claude Code SDK has generated a complete project structure. You can now edit the code, preview the app, or ask me to add more features.`
        }]);
      } else {
        setOutput(prev => prev + `❌ Project creation failed: ${result.error}\n\n${result.suggestion || ''}`);
        setCurrentStep('input');
      }
    } catch (error) {
      setOutput(prev => prev + `❌ Error: ${error.message}`);
      setCurrentStep('input');
    } finally {
      setIsBuilding(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });

      const result = await response.json();

      if (result.success) {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.response || 'Changes applied successfully!'
        }]);
        
        if (result.files) {
          setFiles(result.files);
        }
      } else {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ Error: ${result.error}`
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Failed to communicate with Claude Code: ${error.message}`
      }]);
    }
  };

  const saveFile = async (filePath, content) => {
    try {
      await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content })
      });
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const generatePreviewHTML = () => {
    if (!files.length) {
      return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>No Project</title></head>
<body style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;">
<div style="text-align:center;"><h2>No Project Created</h2><p>Create a project with Claude Code SDK to see preview</p></div>
</body></html>`;
    }

    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const jsFiles = files.filter(f => f.name.endsWith('.js') || f.name.endsWith('.jsx'));
    const cssFiles = files.filter(f => f.name.endsWith('.css'));

    if (htmlFile) {
      // Use the generated HTML file
      let html = htmlFile.content;
      
      // Inject CSS
      const cssContent = cssFiles.map(f => f.content).join('\n');
      if (cssContent) {
        html = html.replace('</head>', `<style>${cssContent}</style></head>`);
      }
      
      // Inject JS (for simple projects)
      const jsContent = jsFiles.map(f => f.content).join('\n');
      if (jsContent) {
        html = html.replace('</body>', `<script>${jsContent}</script></body>`);
      }
      
      return html;
    }

    // Fallback: create a simple preview
    const cssContent = cssFiles.map(f => f.content).join('\n');
    const jsContent = jsFiles.map(f => f.content).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Code Project</title>
  <style>${cssContent}</style>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">${jsContent}</script>
</body>
</html>`;
  };

  if (currentStep === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Code className="w-8 h-8 text-yellow-400 mr-3" />
              <h1 className="text-4xl font-bold">Claude Code SDK Builder</h1>
            </div>
            <p className="text-xl text-gray-300">Powered by Claude Code CLI - Professional AI development</p>
          </div>

          {/* Status Check */}
          {claudeCodeStatus && (
            <div className="max-w-4xl mx-auto mb-8">
              <div className={`rounded-lg p-4 ${claudeCodeStatus.claudeCode ? 'bg-green-800' : 'bg-red-800'}`}>
                <div className="flex items-center">
                  {claudeCodeStatus.claudeCode ? 
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" /> :
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  }
                  <span className="font-semibold">
                    {claudeCodeStatus.claudeCode ? 
                      `Claude Code CLI Ready (${claudeCodeStatus.version})` :
                      'Claude Code CLI Not Found'
                    }
                  </span>
                </div>
                {!claudeCodeStatus.claudeCode && (
                  <p className="mt-2 text-sm">
                    Install with: <code className="bg-black bg-opacity-30 px-2 py-1 rounded">npm install -g @anthropic-ai/claude-code</code>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 text-center">Create New Project</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-app"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Project Description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Build a modern todo app with React, featuring dark theme, local storage, drag-and-drop functionality, and responsive design..."
                  className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={createProject}
                disabled={!projectName.trim() || !projectDescription.trim() || isBuilding || !claudeCodeStatus?.claudeCode}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                {isBuilding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                <span>{isBuilding ? 'Claude Code SDK is building...' : 'Create with Claude Code SDK'}</span>
                {!isBuilding && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="text-center mt-8 text-gray-400 text-sm">
            <p>✨ Professional development with Claude Code CLI</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'building') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Code className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Claude Code SDK is Building</h2>
          <p className="text-gray-300 mb-8">Using Claude Code CLI to generate your professional project...</p>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            </div>
            <p className="mt-4 text-sm text-gray-400">This may take a minute while Claude Code sets up your project structure...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main IDE interface (when project is complete)
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Code className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold">{projectName || 'Claude Code Project'}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const iframe = document.getElementById('preview-iframe');
              if (iframe) {
                iframe.srcdoc = generatePreviewHTML();
              }
            }}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded flex items-center space-x-1"
          >
            <Play className="w-4 h-4" />
            <span>Run</span>
          </button>
          
          <button 
            onClick={() => {
              // Download all files
              files.forEach(file => {
                const blob = new Blob([file.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(url);
              });
            }}
            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="flex border-b border-gray-700">
            <div className="flex-1 px-3 py-2 text-sm flex items-center justify-center space-x-1 bg-gray-700 text-blue-400">
              <FolderOpen className="w-4 h-4" />
              <span>Files</span>
            </div>
            <button
              onClick={() => {
                if (chatMessages.length === 0) {
                  setChatMessages([{
                    role: 'assistant',
                    content: `🎉 Your ${projectName} project is ready! Claude Code SDK has generated a complete project structure. You can now edit the code, preview the app, or ask me to add more features.`
                  }]);
                }
              }}
              className="flex-1 px-3 py-2 text-sm flex items-center justify-center space-x-1 hover:bg-gray-700"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Claude Chat</span>
            </button>
          </div>

          {/* File List */}
          <div className="flex-1 p-2">
            {files.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No files yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {files.map(file => (
                  <div
                    key={file.id}
                    className={`flex items-center p-2 rounded cursor-pointer ${
                      file.id === activeFileId ? 'bg-blue-600' : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveFileId(file.id)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat */}
          {chatMessages.length > 0 && (
            <div className="border-t border-gray-700 h-64 flex flex-col">
              <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-2">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-xs ${
                        message.role === 'user' 
                          ? 'bg-blue-600 ml-4' 
                          : 'bg-gray-700 mr-4'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  ))}
                </div>
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-2 border-t border-gray-600">
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Ask Claude Code for changes..."
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="bg-blue-600 hover:bg-blue-700 p-1 rounded"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* File Tabs */}
          <div className="bg-gray-800 border-b border-gray-700 flex">
            {files.map(file => (
              <div
                key={file.id}
                className={`flex items-center space-x-2 px-3 py-2 border-r border-gray-700 cursor-pointer ${
                  file.id === activeFileId ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveFileId(file.id)}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">{file.name}</span>
              </div>
            ))}
          </div>

          {/* Editor and Preview */}
          <div className="flex-1 flex" style={{ height: showConsole ? `calc(100% - ${consoleHeight}px)` : '100%' }}>
            {/* Code Editor */}
            <div className="relative" style={{ width: `${previewWidth}%` }}>
              <textarea
                value={activeFile?.content || ''}
                onChange={(e) => {
                  if (!activeFile) return;
                  
                  const updatedFiles = files.map(f => 
                    f.id === activeFileId ? { ...f, content: e.target.value } : f
                  );
                  setFiles(updatedFiles);
                  
                  // Auto-save
                  saveFile(activeFile.path || activeFile.name, e.target.value);
                  
                  // Update preview
                  setTimeout(() => {
                    const iframe = document.getElementById('preview-iframe');
                    if (iframe) {
                      iframe.srcdoc = generatePreviewHTML();
                    }
                  }, 500);
                }}
                className="w-full h-full bg-gray-900 text-white p-4 font-mono text-sm resize-none border-none outline-none"
                placeholder="Select a file to edit..."
                spellCheck={false}
              />
            </div>
            
            {/* Resizable divider */}
            <div 
              className="w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = previewWidth;
                
                const handleMouseMove = (e) => {
                  const deltaX = e.clientX - startX;
                  const containerWidth = e.target.parentNode.offsetWidth;
                  const deltaPercent = (deltaX / containerWidth) * 100;
                  const newWidth = Math.max(20, Math.min(80, startWidth + deltaPercent));
                  setPreviewWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            
            {/* Live Preview */}
            <div className="bg-white flex flex-col" style={{ width: `${100 - previewWidth}%` }}>
              <div className="bg-gray-700 px-3 py-2 border-b border-gray-600 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">Live Preview</span>
                </div>
                <button
                  onClick={() => {
                    const iframe = document.getElementById('preview-iframe');
                    if (iframe) {
                      iframe.srcdoc = generatePreviewHTML();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs text-white"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex-1 relative">
                <iframe
                  id="preview-iframe"
                  srcDoc={generatePreviewHTML()}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin"
                  title="Live Preview"
                />
              </div>
            </div>
          </div>
          
          {/* Console */}
          {showConsole && (
            <div 
              className="bg-gray-800 border-t border-gray-700 flex flex-col"
              style={{ height: `${consoleHeight}px` }}
            >
              <div 
                className="bg-gray-700 px-3 py-2 flex items-center justify-between cursor-ns-resize"
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startHeight = consoleHeight;
                  
                  const handleMouseMove = (e) => {
                    const newHeight = startHeight - (e.clientY - startY);
                    if (newHeight >= 100 && newHeight <= 500) {
                      setConsoleHeight(newHeight);
                    }
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              >
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <span className="text-sm font-semibold">Console</span>
                </div>
                <button
                  onClick={() => setShowConsole(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {output || 'Console ready...\n\nYour Claude Code project will show output here.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span>Language: {activeFile?.language || 'text'}</span>
          <span>Ready</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          <span>Claude Code SDK Connected</span>
        </div>
      </div>
    </div>
  );
};

export default ClaudeCodeBuilder;