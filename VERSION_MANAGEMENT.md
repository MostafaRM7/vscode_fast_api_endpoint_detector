# Version Management Guide

This guide explains how to manage versions of the FastAPI Endpoint Detector extension.

## 🚀 Quick Start

### Using the Version Manager Script

The project includes a comprehensive version management script at `scripts/version-manager.sh` that automates most version-related tasks.

```bash
# Make the script executable (first time only)
chmod +x scripts/version-manager.sh

# Show current version
./scripts/version-manager.sh current

# Bump version (patch)
./scripts/version-manager.sh bump patch

# Full release process
./scripts/version-manager.sh release minor

# Show help
./scripts/version-manager.sh help
```

### Manual Version Management

If you prefer manual control, you can manage versions directly:

```bash
# Update version in package.json
npm version patch  # or minor, major

# Compile TypeScript
npm run compile

# Package extension
npx vsce package
```

## 📋 Available Commands

### Version Manager Script Commands

| Command | Description | Example |
|---------|-------------|---------|
| `current` | Show current version | `./scripts/version-manager.sh current` |
| `bump [type]` | Bump version (major/minor/patch) | `./scripts/version-manager.sh bump patch` |
| `set [version]` | Set specific version | `./scripts/version-manager.sh set 1.2.3` |
| `build` | Build and package extension | `./scripts/version-manager.sh build` |
| `release [type]` | Full release process | `./scripts/version-manager.sh release minor` |
| `archive [version]` | Archive specific version | `./scripts/version-manager.sh archive 1.0.0` |
| `list` | List all archived versions | `./scripts/version-manager.sh list` |
| `clean` | Clean build artifacts | `./scripts/version-manager.sh clean` |

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch for changes and compile |
| `npm run package` | Package extension to VSIX |

## 🔄 Version Types

### Semantic Versioning

The extension follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes (backward compatible)

### When to Bump Which Version

#### Patch Version (1.0.0 → 1.0.1)
- Bug fixes
- Performance improvements
- Documentation updates
- Small UI improvements

#### Minor Version (1.0.0 → 1.1.0)
- New features
- New configuration options
- Enhanced existing features
- New commands

#### Major Version (1.0.0 → 2.0.0)
- Breaking changes
- Major architecture changes
- Incompatible API changes
- Removal of deprecated features

## 📦 Release Process

### Automated Release (Recommended)

```bash
# Full release process with minor version bump
./scripts/version-manager.sh release minor

# This will:
# 1. Bump version from 1.0.0 to 1.1.0
# 2. Update package.json
# 3. Compile TypeScript
# 4. Package extension
# 5. Archive previous version
# 6. Show next steps
```

### Manual Release Process

1. **Update Version**
   ```bash
   ./scripts/version-manager.sh bump patch
   ```

2. **Build Extension**
   ```bash
   npm run compile
   npx vsce package
   ```

3. **Test Extension**
   - Install the VSIX file in VS Code
   - Test all functionality
   - Verify endpoint detection works

4. **Archive Previous Version**
   ```bash
   ./scripts/version-manager.sh archive 1.0.0
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "chore: bump version to 1.0.1"
   ```

6. **Create Git Tag**
   ```bash
   git tag v1.0.1
   ```

7. **Push Changes**
   ```bash
   git push origin main --tags
   ```

8. **Publish to Marketplace**
   ```bash
   npx vsce publish
   ```

## 📁 File Structure

### Version-Related Files

```
├── package.json              # Contains version number
├── scripts/
│   └── version-manager.sh   # Version management script
├── versions/                # Archived VSIX files
│   ├── fastapi-endpoint-detector-1.0.0.vsix
│   ├── fastapi-endpoint-detector-1.0.1.vsix
│   └── ...
└── fastapi-endpoint-detector-1.0.2.vsix  # Current version
```

### Generated Files

During the build process, these files are created:

```
├── out/                     # Compiled JavaScript
│   ├── extension.js
│   └── extension.js.map
├── node_modules/           # Dependencies
└── *.vsix                  # Packaged extension
```

## 🔧 Configuration

### Package.json Version

The version is stored in `package.json`:

```json
{
  "name": "fastapi-endpoint-detector",
  "version": "1.0.0",
  "displayName": "FastAPI Endpoint Detector",
  ...
}
```

### Version Manager Configuration

The script uses these configuration variables:

```bash
EXTENSION_NAME="fastapi-endpoint-detector"
PACKAGE_JSON="package.json"
VERSIONS_DIR="versions"
REPO_URL="https://github.com/basalam3922/vscode-fastapi-endpoint-detector"
```

## 🐛 Troubleshooting

### Common Issues

#### Script Permission Denied
```bash
chmod +x scripts/version-manager.sh
```

#### VSCE Not Found
```bash
npm install -g vsce
```

#### TypeScript Compilation Errors
```bash
npm run clean
npm install
npm run compile
```

#### Package.json Not Found
Make sure you're running commands from the project root directory.

### Build Artifacts Cleanup

```bash
# Clean all build artifacts
./scripts/version-manager.sh clean

# Or manually:
rm -rf node_modules/
rm -rf out/
rm -f *.vsix
```

## 📊 Version History Tracking

### Viewing Version History

```bash
# List all archived versions
./scripts/version-manager.sh list

# Show current version
./scripts/version-manager.sh current

# Git tags
git tag -l
```

### Version Changelog

For each version, document changes in your commit messages:

```bash
# Good commit messages
git commit -m "feat: add new endpoint detection for api_route decorator"
git commit -m "fix: resolve issue with router endpoints not being detected"
git commit -m "docs: update configuration examples"
```

## 🚀 Publishing to Marketplace

### Prerequisites

1. **VSCE Tool**
   ```bash
   npm install -g vsce
   ```

2. **Personal Access Token**
   - Go to [Azure DevOps](https://dev.azure.com)
   - Create a Personal Access Token with Marketplace permissions

3. **Publisher Account**
   - Create a publisher account on [VS Code Marketplace](https://marketplace.visualstudio.com/manage)

### Publishing Commands

```bash
# Login to marketplace
vsce login [publisher-name]

# Package extension
vsce package

# Publish extension
vsce publish

# Publish with specific version
vsce publish 1.0.1

# Publish patch version
vsce publish patch
```

## 🎯 Best Practices

1. **Always Test Before Release**
   - Install the VSIX file locally
   - Test with real FastAPI projects
   - Verify all features work

2. **Use Semantic Versioning**
   - Follow SemVer guidelines
   - Document breaking changes

3. **Archive Old Versions**
   - Keep previous versions for rollback
   - Use the versions/ directory

4. **Automated Testing**
   - Set up CI/CD pipeline
   - Run tests before publishing

5. **Documentation**
   - Update README for new features
   - Document configuration changes
   - Keep changelog updated

---

For more information, see the main [README.md](README.md) file. 