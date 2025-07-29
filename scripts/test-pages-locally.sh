#!/bin/bash

# Test script to simulate GitHub Pages deployment locally

echo "🧪 Testing GitHub Pages structure locally..."

# Create gh-pages directory
mkdir -p gh-pages

# Copy reports
if [ -d "reports" ]; then
    cp -r reports/* gh-pages/ 2>/dev/null || true
    echo "✅ Reports copied to gh-pages/"
else
    echo "❌ No reports directory found. Run 'npm run test:cucumber:report' first."
    exit 1
fi

# Copy and customize the HTML template
if [ -f ".github/templates/reports-index.html" ]; then
    cp .github/templates/reports-index.html gh-pages/index.html
    
    # Replace placeholders for local testing
    sed -i"" 's/{{GITHUB_SHA}}/local-test/g' gh-pages/index.html
    
    # Update the commit section for local testing  
    sed -i"" 's/<p>Commit: <span id="commit">local-test<\/span><\/p>/<p>Environment: Local Test<\/p>/g' gh-pages/index.html
else
    echo "❌ Template file not found at .github/templates/reports-index.html"
    exit 1
fi

echo "✅ GitHub Pages structure created in gh-pages/"
echo "📂 Files in gh-pages/:"
ls -la gh-pages/

echo ""
echo "🌐 You can now serve the gh-pages directory locally:"
echo "   cd gh-pages && python -m http.server 8000"
echo "   Then open: http://localhost:8000"
