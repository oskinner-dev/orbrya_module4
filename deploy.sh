#!/bin/bash
# deploy.sh - Deploy Orbrya Engine to GitHub Pages
# Usage: ./deploy.sh [repo-url]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Orbrya Engine - GitHub Pages Deployment${NC}"
echo "=============================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "\n${YELLOW}[1/5] Installing dependencies...${NC}"
npm install

# Step 2: Run build
echo -e "\n${YELLOW}[2/5] Building for production...${NC}"
npm run build

# Step 3: Copy test page to dist
echo -e "\n${YELLOW}[3/5] Copying test assets...${NC}"
cp -r assets dist/ 2>/dev/null || echo "No assets folder to copy"

# Step 4: Create .nojekyll file (needed for GitHub Pages)
echo -e "\n${YELLOW}[4/5] Preparing for GitHub Pages...${NC}"
touch dist/.nojekyll

# Step 5: Deploy to gh-pages branch
echo -e "\n${YELLOW}[5/5] Deploying to gh-pages branch...${NC}"

# Get repo URL
REPO_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
    echo -e "${RED}Error: No git remote found. Add one with:${NC}"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/orbrya-engine.git"
    exit 1
fi

# Extract repo name for URL
REPO_NAME=$(basename -s .git "$REPO_URL")
USERNAME=$(echo "$REPO_URL" | sed -E 's/.*[:/]([^/]+)\/[^/]+\.git/\1/')

cd dist

# Initialize git in dist folder
git init
git add -A
git commit -m "Deploy Orbrya Engine $(date '+%Y-%m-%d %H:%M:%S')"

# Force push to gh-pages branch
git push -f "$REPO_URL" HEAD:gh-pages

cd ..

# Output deployment URL
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "=============================================="
echo -e "Your site will be available at:"
echo -e "${GREEN}  https://${USERNAME}.github.io/${REPO_NAME}/${NC}"
echo ""
echo -e "Test page:"
echo -e "${GREEN}  https://${USERNAME}.github.io/${REPO_NAME}/test.html${NC}"
echo ""
echo -e "${YELLOW}Note: It may take 1-2 minutes for GitHub Pages to update.${NC}"
