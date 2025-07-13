#!/bin/bash

# FastAPI Endpoint Detector - Version Manager
# This script helps manage versions of the VS Code extension

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXTENSION_NAME="fastapi-endpoint-detector"
PACKAGE_JSON="package.json"
VERSIONS_DIR="versions"
REPO_URL="https://github.com/basalam3922/vscode-fastapi-endpoint-detector"

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm."
    exit 1
fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Some features may not work properly."
    fi
    
    if ! command -v vsce &> /dev/null; then
        print_warning "vsce is not installed. Installing now..."
        npm install -g vsce
    fi
    
    print_success "Dependencies check completed."
}

# Get current version from package.json
get_current_version() {
    if [ -f "$PACKAGE_JSON" ]; then
        grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$PACKAGE_JSON" | cut -d'"' -f4
    else
        print_error "package.json not found!"
        exit 1
    fi
}

# Update version in package.json
update_version() {
    local new_version=$1
    
    if [ -f "$PACKAGE_JSON" ]; then
        # Create backup
        cp "$PACKAGE_JSON" "$PACKAGE_JSON.backup"

        # Update version using sed
        sed -i.tmp "s/\"version\":[[:space:]]*\"[^\"]*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"
        rm -f "$PACKAGE_JSON.tmp"
        
        print_success "Version updated to $new_version in package.json"
    else
        print_error "package.json not found!"
        exit 1
    fi
}

# Increment version number
increment_version() {
    local version=$1
    local type=$2
    
    IFS='.' read -r major minor patch <<< "$version"
    
    case $type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
        ;;
        "minor")
            minor=$((minor + 1))
            patch=0
        ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            print_error "Invalid version type. Use: major, minor, or patch"
            exit 1
        ;;
esac

    echo "$major.$minor.$patch"
}

# Build and package the extension
build_extension() {
    print_info "Building extension..."
    
    # Install dependencies
    npm install

# Compile TypeScript
npm run compile

    # Package the extension
    vsce package
    
    local vsix_file="${EXTENSION_NAME}-$(get_current_version).vsix"
    
    if [ -f "$vsix_file" ]; then
        print_success "Extension packaged successfully: $vsix_file"
        echo "$vsix_file"
    else
        print_error "Failed to package extension!"
        exit 1
    fi
}

# Archive old version
archive_version() {
    local version=$1
    local vsix_file="${EXTENSION_NAME}-${version}.vsix"
    
    # Create versions directory if it doesn't exist
    mkdir -p "$VERSIONS_DIR"
    
    # Move the VSIX file to versions directory
    if [ -f "$vsix_file" ]; then
        mv "$vsix_file" "$VERSIONS_DIR/"
        print_success "Version $version archived to $VERSIONS_DIR/"
    else
        print_warning "VSIX file not found: $vsix_file"
    fi
}

# Show usage information
show_usage() {
    echo "FastAPI Endpoint Detector - Version Manager"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  current                 Show current version"
    echo "  bump [type]            Bump version (major|minor|patch)"
    echo "  set [version]          Set specific version"
    echo "  build                  Build and package extension"
    echo "  release [type]         Full release process (bump + build + archive)"
    echo "  archive [version]      Archive specific version"
    echo "  list                   List all archived versions"
    echo "  clean                  Clean build artifacts"
    echo "  help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 current"
    echo "  $0 bump patch"
    echo "  $0 set 1.2.3"
    echo "  $0 release minor"
    echo "  $0 build"
    echo ""
}

# List archived versions
list_versions() {
    print_info "Archived versions:"
    
    if [ -d "$VERSIONS_DIR" ]; then
        ls -la "$VERSIONS_DIR"/*.vsix 2>/dev/null || print_warning "No archived versions found."
    else
        print_warning "Versions directory not found."
    fi
}

# Clean build artifacts
clean_build() {
    print_info "Cleaning build artifacts..."
    
    rm -rf node_modules/
    rm -rf out/
    rm -f *.vsix
    
    print_success "Build artifacts cleaned."
}

# Full release process
release_version() {
    local version_type=$1
    
    if [ -z "$version_type" ]; then
        print_error "Version type is required for release. Use: major, minor, or patch"
    exit 1
fi

    local current_version=$(get_current_version)
    local new_version=$(increment_version "$current_version" "$version_type")
    
    print_info "Starting release process..."
    print_info "Current version: $current_version"
    print_info "New version: $new_version"
    
    # Confirm release
    echo -n "Proceed with release? (y/N): "
    read -r confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_info "Release cancelled."
        exit 0
    fi
    
    # Update version
    update_version "$new_version"
    
    # Build extension
    local vsix_file=$(build_extension)
    
    # Archive previous version if exists
    if [ -f "${EXTENSION_NAME}-${current_version}.vsix" ]; then
        archive_version "$current_version"
    fi
    
    print_success "Release completed successfully!"
    print_info "New version: $new_version"
    print_info "VSIX file: $vsix_file"
    print_info "Next steps:"
    print_info "  1. Test the extension"
    print_info "  2. Commit changes to git"
    print_info "  3. Create git tag: git tag v$new_version"
    print_info "  4. Push changes: git push origin main --tags"
    print_info "  5. Publish to marketplace: vsce publish"
}

# Main script logic
main() {
    local command=$1
    local arg=$2
    
    case $command in
        "current")
            echo "Current version: $(get_current_version)"
            ;;
        "bump")
            if [ -z "$arg" ]; then
                print_error "Version type is required. Use: major, minor, or patch"
                exit 1
            fi
            local current_version=$(get_current_version)
            local new_version=$(increment_version "$current_version" "$arg")
            update_version "$new_version"
            ;;
        "set")
            if [ -z "$arg" ]; then
                print_error "Version number is required."
                exit 1
            fi
            update_version "$arg"
            ;;
        "build")
            build_extension
            ;;
        "release")
            release_version "$arg"
            ;;
        "archive")
            if [ -z "$arg" ]; then
                print_error "Version number is required."
                exit 1
            fi
            archive_version "$arg"
            ;;
        "list")
            list_versions
            ;;
        "clean")
            clean_build
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run dependency check
check_dependencies

# Execute main function with all arguments
main "$@" 