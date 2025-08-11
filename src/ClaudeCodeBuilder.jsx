import React, { useState, useRef, useCallback, useEffect } from 'react';

const ClaudeCodeBuilder = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectDescription, setProjectDescription] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [activeFile, setActiveFile] = useState('');
  const [fileContents, setFileContents] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [rightPanelHeight, setRightPanelHeight] = useState(70);
  const [showConsole, setShowConsole] = useState(true);
  
  const previewRef = useRef(null);
  const isDraggingVertical = useRef(false);
  const isDraggingHorizontal = useRef(false);
  const containerRef = useRef(null);

  const addToConsole = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => [...prev.slice(-49), { timestamp, message, type }]);
  }, []);

  const callClaudeAPI = async (messages, options = {}) => {
    try {
      addToConsole('Making Claude API request...', 'info');
      
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: options.maxTokens || 4096,
          messages,
          system: options.system || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error ${response.status}: ${errorData.error}`);
      }

      const data = await response.json();
      addToConsole('Claude API response received', 'success');
      return data;
      
    } catch (error) {
      addToConsole(`API Error: ${error.message}`, 'error');
      throw error;
    }
  };

  const parseFiles = (content) => {
    const files = [];
    const fileRegex = /```(\w+)?\s*(?:\/\/\s*)?(.+?)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(content)) !== null) {
      const [, language, filename, code] = match;
      if (filename && code.trim()) {
        files.push({
          name: filename.trim(),
          content: code.trim(),
          language: language || getLanguageFromFilename(filename.trim())
        });
      }
    }

    if (files.length === 0) {
      const altRegex = /File:\s*(.+?)\n```(\w+)?\n([\s\S]*?)```/g;
      while ((match = altRegex.exec(content)) !== null) {
        const [, filename, language, code] = match;
        if (filename && code.trim()) {
          files.push({
            name: filename.trim(),
            content: code.trim(),
            language: language || getLanguageFromFilename(filename.trim())
          });
        }
      }
    }

    return files;
  };

  const getLanguageFromFilename = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'css': 'css', 'scss': 'scss', 'html': 'html', 'htm': 'html',
      'json': 'json', 'md': 'markdown', 'py': 'python'
    };
    return langMap[ext] || 'text';
  };

  const generatePreviewHtml = () => {
    const appJs = fileContents['App.js'] || fileContents['App.jsx'] || '';
    const css = fileContents['styles.css'] || fileContents['App.css'] || fileContents['index.css'] || '';
    const html = fileContents['index.html'] || '';

    if (!appJs && !html) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>No Preview</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                font-family: system-ui;
                color: white;
                text-align: center;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
            </style>
          </head>
          <body>
            <div>
              <h2>No Preview Available</h2>
              <p>Generate a project to see live preview</p>
            </div>
          </body>
        </html>
      `;
    }

    if (html) {
      return html;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated App</title>
        <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js"></script>
        <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
        <style>
          body { margin: 0; padding: 0; font-family: system-ui; }
          ${css}
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          ${appJs}
          
          if (typeof App !== 'undefined') {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
          }
        </script>
      </body>
      </html>
    `;
  };

  const updatePreview = useCallback(() => {
    const html = generatePreviewHtml();
    setPreviewHtml(html);
    
    if (previewRef.current) {
      previewRef.current.srcdoc = html;
    }
  }, [fileContents]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const generateProject = async () => {
    if (!projectDescription.trim()) {
      addToConsole('Please enter a project description', 'error');
      return;
    }

    setIsGenerating(true);
    addToConsole(`Starting project generation: "${projectDescription}"`, 'info');

    try {
      const systemPrompt = `You are Claude Code, a professional web developer assistant. Create a complete, working project based on the user's description.

Generate EXACTLY these 4 files:
1. App.js - A complete React component
2. styles.css - Complete styling 
3. index.html - Full HTML page
4. README.md - Project documentation

Use this EXACT format for each file:
\`\`\`javascript
// App.js
[React component code]
\`\`\`

\`\`\`css
/* styles.css */
[CSS styling]
\`\`\`

\`\`\`html
<!-- index.html -->
[HTML page]
\`\`\`

\`\`\`markdown
# README.md
[Documentation]
\`\`\`

Make it functional and professional.`;

      const response = await callClaudeAPI([
        { role: 'user', content: projectDescription }
      ], { 
        system: systemPrompt,
        maxTokens: 4096 
      });

      if (response.content?.[0]?.text) {
        const content = response.content[0].text;
        const files = parseFiles(content);
        
        addToConsole(`Parsed ${files.length} files from response`, 'info');
        
        if (files.length === 0) {
          addToConsole('No files found in response', 'error');
          return;
        }

        setGeneratedFiles(files);
        
        const newFileContents = {};
        files.forEach(file => {
          newFileContents[file.name] = file.content;
        });
        setFileContents(newFileContents);
        
        if (files.length > 0) {
          setActiveFile(files[0].name);
        }
        
        files.forEach(file => {
          addToConsole(`Generated: ${file.name} (${file.content.length} chars)`, 'success');
        });
        
        addToConsole('Project generation completed', 'success');
      }
    } catch (error) {
      addToConsole(`Generation failed: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const chatWithClaude = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    addToConsole(`Chat: ${userMessage}`, 'info');

    try {
      const systemPrompt = `You are helping improve a web project. Current files:
${generatedFiles.map(f => `- ${f.name}`).join('\n')}

When updating code, return the complete file using this format:
\`\`\`javascript
// filename.js
[complete updated code]
\`\`\`

Provide working improvements.`;

      const chatHistory = chatMessages.slice(-4);
      const response = await callClaudeAPI([
        ...chatHistory,
        { role: 'user', content: userMessage }
      ], { 
        system: systemPrompt,
        maxTokens: 2048 
      });

      if (response.content?.[0]?.text) {
        const reply = response.content[0].text;
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        
        const updatedFiles = parseFiles(reply);
        if (updatedFiles.length > 0) {
          updatedFiles.forEach(file => {
            setFileContents(prev => ({
              ...prev,
              [file.name]: file.content
            }));
            addToConsole(`Updated: ${file.name}`, 'success');
          });
        }
        
        addToConsole('Claude responded', 'success');
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
      addToConsole(`Chat error: ${error.message}`, 'error');
    }
  };

  const saveFile = (filename, content) => {
    setFileContents(prev => ({
      ...prev,
      [filename]: content
    }));
    addToConsole(`Saved: ${filename}`, 'info');
  };

  const downloadProject = () => {
    if (generatedFiles.length === 0) {
      addToConsole('No files to download', 'error');
      return;
    }

    generatedFiles.forEach(file => {
      const content = fileContents[file.name] || file.content;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    addToConsole(`Downloaded ${generatedFiles.length} files`, 'success');
  };

  const popOutPreview = () => {
    if (!previewHtml) {
      addToConsole('No preview to pop out', 'error');
      return;
    }

    try {
      const newWindow = window.open('', '_blank', 'width=1200,height=800');
      if (newWindow) {
        newWindow.document.write(previewHtml);
        newWindow.document.close();
        addToConsole('Preview opened in new window', 'success');
      } else {
        addToConsole('Pop-up blocked', 'error');
      }
    } catch (error) {
      addToConsole(`Pop-out failed: ${error.message}`, 'error');
    }
  };

  const handleMouseDown = useCallback((e, direction) => {
    e.preventDefault();
    if (direction === 'vertical') {
      isDraggingVertical.current = true;
    } else {
      isDraggingHorizontal.current = true;
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;

    if (isDraggingVertical.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth)));
    }

    if (isDraggingHorizontal.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
      setRightPanelHeight(Math.max(30, Math.min(90, newHeight)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingVertical.current = false;
    isDraggingHorizontal.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="min-h-screen bg-gray-950 text-white" ref={containerRef}>
      <div className="border-b border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Claude Code Builder
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              AI-powered development platform
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={downloadProject}
              disabled={generatedFiles.length === 0}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-sm rounded-md transition-colors"
            >
              Download Project
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Describe your project..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && generateProject()}
          />
          <button
            onClick={generateProject}
            disabled={isGenerating}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-md transition-colors whitespace-nowrap"
          >
            {isGenerating ? 'Generating...' : 'Generate with Claude'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        <div 
          className="bg-gray-900 border-r border-gray-800 flex flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="border-b border-gray-800 bg-gray-800">
            <div className="flex overflow-x-auto">
              {generatedFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setActiveFile(file.name)}
                  className={`px-4 py-2 text-sm whitespace-nowrap border-r border-gray-700 transition-colors ${
                    activeFile === file.name
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-750'
                  }`}
                >
                  {file.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeFile && fileContents[activeFile] ? (
              <textarea
                value={fileContents[activeFile]}
                onChange={(e) => saveFile(activeFile, e.target.value)}
                className="w-full h-full p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p>Select a file to edit</p>
                  <p className="text-sm mt-2">Generate a project to get started</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 bg-gray-850">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-300">Chat with Claude</h3>
            </div>
            
            <div className="h-40 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">
                  Ask Claude to modify your code...
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-blue-400' : 'text-gray-300'}`}>
                    <strong>{msg.role === 'user' ? 'You:' : 'Claude:'}</strong> {msg.content}
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Claude to modify the code..."
                  className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && chatWithClaude()}
                />
                <button
                  onClick={chatWithClaude}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="w-1 bg-blue-600 cursor-col-resize hover:bg-blue-500"
          onMouseDown={(e) => handleMouseDown(e, 'vertical')}
        />

        <div className="flex-1 flex flex-col">
          <div 
            className="bg-white border-b border-gray-800"
            style={{ height: `${rightPanelHeight}%` }}
          >
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Live Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={updatePreview}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={popOutPreview}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  Pop Out
                </button>
              </div>
            </div>
            
            <iframe
              ref={previewRef}
              className="w-full h-[calc(100%-40px)] border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              srcDoc={previewHtml}
            />
          </div>

          <div
            className="h-1 bg-blue-600 cursor-row-resize hover:bg-blue-500"
            onMouseDown={(e) => handleMouseDown(e, 'horizontal')}
          />

          {showConsole && (
            <div 
              className="bg-gray-900 flex flex-col"
              style={{ height: `${100 - rightPanelHeight}%` }}
            >
              <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-300">Console</h3>
                <button
                  onClick={() => setConsoleOutput([])}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  Clear
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                {consoleOutput.length === 0 ? (
                  <div className="text-gray-500">Console output will appear here...</div>
                ) : (
                  consoleOutput.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`mb-1 ${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        'text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaudeCodeBuilder;
