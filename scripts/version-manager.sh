#!/bin/bash

# FastAPI Runner Extension Version Manager
# Usage: ./scripts/version-manager.sh [major|minor|patch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 FastAPI Runner Extension Version Manager${NC}"
echo "=================================================="

# Default to patch if no argument provided
VERSION_TYPE=${1:-patch}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo -e "${RED}❌ Invalid version type: $VERSION_TYPE${NC}"
    echo "Usage: $0 [major|minor|patch]"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo -e "${YELLOW}📋 Current version: $CURRENT_VERSION${NC}"

# Parse version numbers
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Increment version based on type
case $VERSION_TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo -e "${GREEN}📦 New version: $NEW_VERSION${NC}"

# Create versions directory if it doesn't exist
mkdir -p versions

# Move current VSIX to versions folder if it exists
if [ -f "fastapi-endpoint-detector-$CURRENT_VERSION.vsix" ]; then
    echo -e "${YELLOW}📁 Moving current VSIX to versions folder...${NC}"
    mv "fastapi-endpoint-detector-$CURRENT_VERSION.vsix" "versions/"
fi

# Update version in package.json
echo -e "${YELLOW}✏️  Updating package.json version...${NC}"
sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json

# Compile TypeScript
echo -e "${YELLOW}🔨 Compiling TypeScript...${NC}"
npm run compile

# Create new VSIX package
echo -e "${YELLOW}📦 Creating VSIX package...${NC}"
npx vsce package

# Verify new VSIX was created
if [ -f "fastapi-endpoint-detector-$NEW_VERSION.vsix" ]; then
    echo -e "${GREEN}✅ Success! New VSIX created: fastapi-endpoint-detector-$NEW_VERSION.vsix${NC}"
    echo -e "${GREEN}📊 File size: $(du -h fastapi-endpoint-detector-$NEW_VERSION.vsix | cut -f1)${NC}"
else
    echo -e "${RED}❌ Error: VSIX file was not created${NC}"
    exit 1
fi

# Show version history
echo -e "${YELLOW}📚 Version history:${NC}"
echo "Current: fastapi-endpoint-detector-$NEW_VERSION.vsix"
echo "Previous versions in versions/ folder:"
ls -la versions/ | grep "\.vsix$" | awk '{print "  - " $9 " (" $5 " bytes)"}'

echo -e "${GREEN}🎉 Version upgrade complete!${NC}"
echo "==================================================" 