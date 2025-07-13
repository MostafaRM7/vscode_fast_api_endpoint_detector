# FastAPI Endpoint Detector - Usage Guide

This guide will help you get started with the FastAPI Endpoint Detector extension and make the most of its features.

## 🚀 Getting Started

### 1. Installation
Make sure you have the FastAPI Endpoint Detector extension installed in VS Code. If not, install it from the VS Code Marketplace or using a VSIX file.

### 2. Opening a FastAPI Project
1. Open VS Code
2. Open a folder containing your FastAPI project
3. The extension will automatically activate when it detects Python files

### 3. Finding Your Endpoints
Once activated, look for the "FastAPI Endpoints" section in the Explorer panel on the left side of VS Code.

## 📋 Features Overview

### Tree View Display
- All detected endpoints are displayed in a hierarchical tree structure
- Endpoints are sorted by path and then by HTTP method
- Each endpoint shows:
  - HTTP method (GET, POST, PUT, DELETE, etc.)
  - Endpoint path
  - Function name (as description)

### Visual Indicators
Each HTTP method has a distinct icon and color:
- 🟢 **GET** - Green arrow down
- 🔵 **POST** - Blue arrow up
- 🟠 **PUT** - Orange double arrow
- 🔴 **DELETE** - Red trash icon
- 🟡 **PATCH** - Yellow edit icon
- 🟣 **HEAD** - Purple info icon
- ⚫ **OPTIONS** - Gray settings icon

### Quick Navigation
- **Single Click**: Opens the file and navigates to the endpoint definition
- **Right Click**: Shows context menu with additional options

## 🎯 Using the Extension

### Viewing Endpoints
1. Open the Explorer panel (Ctrl+Shift+E)
2. Look for the "FastAPI Endpoints" section
3. Browse through your detected endpoints

### Navigating to Code
1. Click on any endpoint in the tree view
2. The corresponding file will open
3. Your cursor will be positioned at the endpoint definition

### Copying Endpoint URLs
1. Right-click on any endpoint
2. Select "Copy Endpoint URL"
3. The full URL (base URL + endpoint path) will be copied to your clipboard

### Refreshing the List
If you add new endpoints or modify existing ones:
1. Click the refresh icon (🔄) in the tree view header
2. Or right-click in the tree view and select "Refresh"
3. The extension also auto-refreshes when Python files are saved (if enabled in settings)

## ⚙️ Configuration

### Accessing Settings
1. Open VS Code Settings (Ctrl+,)
2. Search for "fastapi-endpoint-detector"
3. Configure the available options

### Base URL Configuration
Set your FastAPI application's base URL:
```json
{
  "fastapi-endpoint-detector.baseUrl": "http://localhost:8000"
}
```

This affects the URLs copied to clipboard when using "Copy Endpoint URL".

### Scan Directories
Configure which directories to scan for endpoints:
```json
{
  "fastapi-endpoint-detector.scanDirectories": [
    ".",
    "src",
    "app"
  ]
}
```

### Exclude Patterns
Exclude certain directories or files from scanning:
```json
{
  "fastapi-endpoint-detector.excludePatterns": [
    "**/__pycache__/**",
    "**/venv/**",
    "**/env/**",
    "**/node_modules/**",
    "**/tests/**"
  ]
}
```

### Auto Refresh
Enable or disable automatic refresh when files change:
```json
{
  "fastapi-endpoint-detector.autoRefresh": true
}
```

## 🔍 Supported FastAPI Patterns

The extension recognizes various FastAPI endpoint patterns:

### Standard App Decorators
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/users")
async def get_users():
    return {"users": []}

@app.post("/users")
async def create_user():
    return {"message": "User created"}
```

### Router Decorators
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/items")
async def get_items():
    return {"items": []}

@router.post("/items")
async def create_item():
    return {"message": "Item created"}
```

### API Route Decorator
```python
@app.api_route("/advanced", methods=["GET", "POST"])
async def advanced_endpoint():
    return {"message": "Advanced endpoint"}
```

### Path Parameters
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    return {"user_id": user_id}

@app.put("/users/{user_id}/posts/{post_id}")
async def update_post(user_id: int, post_id: int):
    return {"user_id": user_id, "post_id": post_id}
```

## 🛠️ Troubleshooting

### No Endpoints Detected
1. **Check File Extensions**: Ensure your files have `.py` extension
2. **Verify FastAPI Syntax**: Make sure you're using proper FastAPI decorator syntax
3. **Check Exclude Patterns**: Verify your files aren't excluded by the configuration
4. **Refresh Manually**: Try clicking the refresh button

### Endpoints Not Updating
1. **Check Auto Refresh**: Ensure `autoRefresh` is enabled in settings
2. **Manual Refresh**: Use the refresh button in the tree view
3. **File Watcher**: The extension watches for file changes - save your Python files to trigger updates

### Incorrect Base URL in Copied URLs
1. **Update Base URL**: Go to settings and update `fastapi-endpoint-detector.baseUrl`
2. **Include Protocol**: Make sure to include `http://` or `https://` in the base URL

### Performance Issues
If the extension is slow on large projects:
1. **Limit Scan Directories**: Use `scanDirectories` to scan only relevant folders
2. **Add Exclude Patterns**: Exclude large directories like `node_modules`, `venv`, etc.
3. **Disable Auto Refresh**: Turn off `autoRefresh` for manual control

## 💡 Tips and Best Practices

### Organizing Your FastAPI Code
For better endpoint detection:
1. **Use Consistent Naming**: Keep your FastAPI app/router variables consistently named
2. **Group Related Endpoints**: Use routers to organize related endpoints
3. **Clear Function Names**: Use descriptive function names for better readability in the tree view

### Working with Large Projects
1. **Use Multiple Routers**: Break your API into logical routers
2. **Configure Scan Directories**: Only scan directories that contain your API code
3. **Use Exclude Patterns**: Exclude test files, migrations, and other non-API code

### Development Workflow
1. **Keep Tree View Open**: Pin the Explorer panel to always see your endpoints
2. **Use Copy URL Feature**: Quickly copy URLs for testing with tools like curl or Postman
3. **Navigate Quickly**: Use the tree view to quickly jump between different endpoints

## 🤝 Getting Help

If you need help:
1. Check this usage guide
2. Review the main README.md file
3. Check the extension's GitHub repository for issues and discussions
4. Create a new issue if you encounter a bug or have a feature request

---

Happy coding with FastAPI! 🚀 