
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Save, Play, Code, FileCode, File } from 'lucide-react';
import { toast } from '@/utils/toast';

const initialFilesData = [
  {
    name: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ledger AI</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  <script src="main.js"></script>
</body>
</html>`,
    language: "html"
  },
  {
    name: "styles.css",
    content: `/* Main stylesheet */
body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f7f7f7;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}`,
    language: "css"
  },
  {
    name: "main.js",
    content: `// Main JavaScript file
document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');
});

function initApp() {
  // Initialize the application
  return true;
}`,
    language: "javascript"
  }
];

interface CodeFile {
  name: string;
  content: string;
  language: string;
}

const CodeEditor: React.FC = () => {
  const [files, setFiles] = useState<CodeFile[]>(initialFilesData);
  const [activeFile, setActiveFile] = useState<string>(initialFilesData[0].name);
  const [editingContent, setEditingContent] = useState<string>(initialFilesData[0].content);

  const handleFileChange = (fileName: string) => {
    // Save current changes before switching
    saveCurrentChanges();
    
    const file = files.find(f => f.name === fileName);
    if (file) {
      setActiveFile(fileName);
      setEditingContent(file.content);
    }
  };

  const saveCurrentChanges = () => {
    setFiles(files.map(file => 
      file.name === activeFile 
        ? { ...file, content: editingContent } 
        : file
    ));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingContent(e.target.value);
  };

  const handleSave = () => {
    saveCurrentChanges();
    toast.success(`File ${activeFile} saved successfully`);
  };

  const handleRun = () => {
    toast.info('Running code (simulated)');
    // In a real app, this would execute the code or deploy changes
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Code className="h-5 w-5" />
          Website Code Editor
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button size="sm" onClick={handleRun}>
            <Play className="h-4 w-4 mr-2" />
            Deploy Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-250px)]">
        <div className="col-span-3 border rounded-lg p-4 overflow-y-auto">
          <h3 className="text-lg font-medium mb-4">Files</h3>
          <div className="space-y-1">
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => handleFileChange(file.name)}
                className={`flex items-center w-full p-2 rounded text-left text-sm ${
                  activeFile === file.name
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <FileCode className="h-4 w-4 mr-2" />
                {file.name}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-9 border rounded-lg flex flex-col">
          <div className="border-b p-2 bg-muted flex items-center">
            <File className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">{activeFile}</span>
          </div>
          <textarea
            value={editingContent}
            onChange={handleContentChange}
            className="flex-1 p-4 font-mono text-sm focus:outline-none resize-none"
            style={{ 
              whiteSpace: 'pre',
              overflow: 'auto' 
            }}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Note</CardTitle>
          <CardDescription>
            This is a simplified code editor for demonstration purposes. In a production environment,
            you would use a more robust solution with syntax highlighting, error checking,
            and proper deployment pipelines.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default CodeEditor;
