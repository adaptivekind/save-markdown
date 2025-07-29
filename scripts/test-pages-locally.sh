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

# Create index.html
cat > gh-pages/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test Reports - Save Markdown Extension</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1rem;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #eee;
        }
        .report-links {
            display: grid;
            gap: 1rem;
            margin-top: 2rem;
        }
        .report-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 1.5rem;
            background: #f9f9f9;
            transition: transform 0.2s;
        }
        .report-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .report-card h3 {
            margin-top: 0;
            color: #333;
        }
        .report-card p {
            color: #666;
            margin-bottom: 1rem;
        }
        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #0066cc;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background: #0052a3;
        }
        .timestamp {
            color: #888;
            font-size: 0.9em;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Test Reports</h1>
        <h2>Save Markdown Extension</h2>
        <p>Automated test results from CI/CD pipeline</p>
    </div>
    
    <div class="report-links">
        <div class="report-card">
            <h3>🥒 Cucumber E2E Test Report</h3>
            <p>Interactive HTML report with screenshots showing the complete extension workflow from creating save rules to saving markdown files.</p>
            <a href="cucumber_report.html" class="btn">View Cucumber Report</a>
        </div>
        
        <div class="report-card">
            <h3>📊 Cucumber JSON Data</h3>
            <p>Machine-readable test results in JSON format for further processing or integration with other tools.</p>
            <a href="cucumber_report.json" class="btn">View JSON Data</a>
        </div>
    </div>
    
    <div class="timestamp">
        <p>Generated: <span id="timestamp"></span></p>
        <p>Environment: Local Test</p>
    </div>
    
    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
    </script>
</body>
</html>
EOF

echo "✅ GitHub Pages structure created in gh-pages/"
echo "📂 Files in gh-pages/:"
ls -la gh-pages/

echo ""
echo "🌐 You can now serve the gh-pages directory locally:"
echo "   cd gh-pages && python -m http.server 8000"
echo "   Then open: http://localhost:8000"