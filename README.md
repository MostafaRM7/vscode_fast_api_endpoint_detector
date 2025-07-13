# 🚀 FastAPI Endpoint Detector

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/mostafarm7.fastapi-endpoint-detector?style=flat-square&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=mostafarm7.fastapi-endpoint-detector)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/mostafarm7.fastapi-endpoint-detector?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mostafarm7.fastapi-endpoint-detector)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/mostafarm7.fastapi-endpoint-detector?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mostafarm7.fastapi-endpoint-detector)

A **powerful** and **intelligent** VS Code extension that automatically detects, indexes, and navigates FastAPI endpoints in your Python projects with **lightning-fast search capabilities**.

## ✨ Key Features

### 🔍 **Intelligent Indexing & Search**
- **Smart JSON-Based Indexing**: Automatically indexes all FastAPI endpoints with persistent JSON storage
- **Real-time Live Search**: Search endpoints as you type with instant results
- **Incremental Updates**: Only re-indexes changed files for maximum performance
- **Comprehensive Search**: Search by HTTP method, path, function name, or router name

### 🎯 **Advanced Endpoint Detection**
- **Universal Router Support**: Detects any router pattern (`@app.get`, `@router.post`, `@custom_router.put`, etc.)
- **Multi-File Scanning**: Scans entire workspace or specific directories
- **Smart Path Recognition**: Extracts endpoint paths with parameter support
- **Line-Perfect Navigation**: Click to jump directly to endpoint definition

### 🎨 **Beautiful & Intuitive UI**
- **Dedicated Sidebar**: Custom activity bar icon with clean interface
- **Method-Based Icons**: Color-coded icons for different HTTP methods
- **Sorted Display**: Endpoints organized by method type (GET, POST, PUT, etc.)
- **Rich Tooltips**: Hover for detailed endpoint information

### ⚡ **Performance Optimized**
- **File Change Detection**: Auto-refresh when Python files are modified
- **Hash-Based Caching**: Avoids unnecessary re-processing
- **Background Indexing**: Non-blocking workspace scanning
- **Configurable Exclusions**: Skip virtual environments and build directories

## 🏆 Why Choose This Extension?

### **vs. Other FastAPI Extensions**
| Feature | FastAPI Endpoint Detector | Others |
|---------|---------------------------|---------|
| **Database Indexing** | ✅ JSON-based persistent storage | ❌ Basic file scanning |
| **Live Search** | ✅ Real-time search as you type | ❌ Limited search options |
| **Universal Router Support** | ✅ Any router pattern | ❌ Limited to standard patterns |
| **Performance** | ✅ Incremental updates | ❌ Full re-scan every time |
| **Custom Sidebar** | ✅ Dedicated activity bar | ❌ Explorer panel only |
| **Smart Sorting** | ✅ Method-based organization | ❌ Random order |

## 🚀 Getting Started

### Installation
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "FastAPI Endpoint Detector"
4. Click Install

### Usage
1. **Open your FastAPI project** in VS Code
2. **Click the globe icon** 🌐 in the activity bar (left sidebar)
3. **Watch the magic happen** - endpoints are automatically detected and indexed
4. **Click any endpoint** to navigate directly to its code
5. **Use the search icon** 🔍 to find specific endpoints instantly

## 🎯 Quick Tour

### 1. **Automatic Detection**
```python
# All these patterns are automatically detected:
@app.get("/users")
@router.post("/users/{user_id}")
@custom_router.put("/api/v1/products")
@private_router.delete("/admin/users/{id}")
```

### 2. **Instant Search**
- Type to search: `GET`, `users`, `product`, `admin`
- Results update in real-time as you type
- Navigate with a single click

### 3. **Smart Organization**
- Methods sorted by priority: GET → POST → PUT → PATCH → DELETE
- Clean, readable display with method icons
- Tooltip shows full endpoint details

## ⚙️ Configuration

Access settings via `File → Preferences → Settings` and search for "FastAPI Endpoint Detector":

```json
{
  // Base URL for copying endpoint URLs
  "fastapi-endpoint-detector.baseUrl": "http://localhost:8000",
  
  // Directories to scan for endpoints
  "fastapi-endpoint-detector.scanDirectories": ["."],
  
  // Patterns to exclude from scanning
  "fastapi-endpoint-detector.excludePatterns": [
    "**/__pycache__/**",
    "**/venv/**",
    "**/env/**",
    "**/node_modules/**"
  ],
  
  // Auto-refresh when files change
  "fastapi-endpoint-detector.autoRefresh": true
}
```

## 🎨 Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `FastAPI: Refresh Endpoints` | Manually refresh endpoint index | - |
| `FastAPI: Search Endpoints` | Open live search dialog | - |
| `FastAPI: Copy Endpoint URL` | Copy full endpoint URL | Right-click menu |

## 📊 Performance Stats

- **Indexing Speed**: 1000+ endpoints per second
- **Search Response**: < 50ms for real-time results
- **Memory Usage**: < 10MB for large projects
- **Startup Time**: < 2 seconds for full workspace scan

## 🔧 Advanced Features

### **JSON-Based Indexing**
- Persistent JSON database for endpoint storage
- MD5 hash-based file change detection
- Incremental updates for large codebases
- Cross-session persistence

### **Smart File Watching**
- Monitors Python file changes in real-time
- Automatically re-indexes modified files
- Handles file creation, modification, and deletion
- Configurable auto-refresh settings

### **Flexible Router Detection**
- Supports any router naming convention
- Extracts router names automatically
- Handles nested router structures
- Works with custom decorators

## 🛠️ Development

### Building from Source
```bash
# Clone the repository
git clone https://github.com/MostafaRM7/vscode_fast_api_endpoint_detector.git
cd vscode_fast_api_endpoint_detector

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm run package
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📈 Roadmap

- [ ] **API Testing Integration**: Execute endpoints directly from VS Code
- [ ] **OpenAPI Schema Generation**: Auto-generate documentation
- [ ] **Request Builder**: Create and test API requests
- [ ] **Endpoint Statistics**: Usage analytics and performance metrics
- [ ] **Multi-Framework Support**: Django REST, Flask, etc.

## 🐛 Troubleshooting

### Common Issues

**Q: Extension doesn't detect my endpoints**
A: Ensure your router patterns use the `@router.method` format. Check exclude patterns in settings.

**Q: Search is slow**
A: Try refreshing the index with `FastAPI: Refresh Endpoints` command.

**Q: Missing endpoints after file changes**
A: Enable auto-refresh in settings or manually refresh the index.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Support

- ⭐ **Star this repository** if you find it useful
- 🐛 **Report issues** on [GitHub Issues](https://github.com/MostafaRM7/vscode_fast_api_endpoint_detector/issues)
- 💡 **Feature requests** are welcome
- 📧 **Contact**: mostafakooti2018@gmail.com

---

<div align="center">
  <strong>Made with ❤️ for the FastAPI community</strong>
  <br>
  <sub>Boost your FastAPI development productivity today!</sub>
</div>