#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '../reports/cucumber_report.html');

if (!fs.existsSync(reportPath)) {
  console.error('Cucumber HTML report not found at:', reportPath);
  process.exit(1);
}

let html = fs.readFileSync(reportPath, 'utf8');

// Custom CSS to expand screenshots by default and improve visibility
const customStyles = `
<style>
/* Custom styles for expanded screenshots */
.zKWxtTmik48Yw6hm6NJT {
  max-width: 100%;
  margin-top: 0.5em;
  border: 2px solid var(--cucumber-panel-accent-color, #e5e5e5);
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Make images responsive and well-sized */
.zKWxtTmik48Yw6hm6NJT img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

/* Expand screenshot containers by default */
details[data-attachment-type="image"] {
  open: true;
}

/* Add some padding around screenshot sections */
.attachment-container {
  margin: 1em 0;
  padding: 1em;
  background-color: var(--cucumber-panel-background-color, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--cucumber-panel-accent-color, #e5e5e5);
}

/* Style attachment headers */
.attachment-header {
  font-weight: bold;
  color: var(--cucumber-keyword-color, #666);
  margin-bottom: 0.5em;
  font-size: 0.9em;
}

/* Ensure screenshots are visible and well-spaced */
[data-media-type="image/png"] img {
  max-width: 800px;
  max-height: 600px;
  width: auto;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 0.5em 0;
}

/* Add hover effects for better UX */
[data-media-type="image/png"] img:hover {
  border-color: var(--cucumber-anchor-color, #4caaee);
  box-shadow: 0 2px 8px rgba(76, 170, 238, 0.3);
  cursor: pointer;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .attachment-container {
    background-color: var(--cucumber-panel-background-color, #282a36);
    border-color: var(--cucumber-panel-accent-color, #313442);
  }
  
  [data-media-type="image/png"] img {
    border-color: #444;
  }
  
  [data-media-type="image/png"] img:hover {
    border-color: var(--cucumber-anchor-color, #4caaee);
  }
}
</style>

<script>
// Script to ensure screenshots are expanded by default
document.addEventListener('DOMContentLoaded', function() {
  // Find all attachment elements (images)
  const attachments = document.querySelectorAll('[data-media-type="image/png"]');
  
  attachments.forEach((attachment) => {
    const img = attachment.querySelector('img');
    if (img) {
      // Add click to expand functionality
      img.addEventListener('click', function() {
        if (this.style.maxWidth === '100%' || !this.style.maxWidth) {
          this.style.maxWidth = '1200px';
          this.style.maxHeight = 'none';
        } else {
          this.style.maxWidth = '100%';
          this.style.maxHeight = '600px';
        }
      });
      
      // Add title for better UX
      img.title = 'Click to toggle size';
      img.alt = 'Test screenshot - Click to toggle size';
    }
    
    // Wrap attachment in a styled container
    if (!attachment.parentElement.classList.contains('attachment-container')) {
      const container = document.createElement('div');
      container.classList.add('attachment-container');
      
      const header = document.createElement('div');
      header.classList.add('attachment-header');
      header.textContent = '📸 Screenshot';
      
      attachment.parentElement.insertBefore(container, attachment);
      container.appendChild(header);
      container.appendChild(attachment);
    }
  });
  
  // Find and open any details elements that might contain attachments
  const detailsElements = document.querySelectorAll('details');
  detailsElements.forEach(details => {
    if (details.querySelector('[data-media-type="image/png"]')) {
      details.open = true;
    }
  });
});
</script>
`;

// Insert the custom styles and scripts before the closing head tag
const headCloseIndex = html.indexOf('</head>');
if (headCloseIndex !== -1) {
  html = html.substring(0, headCloseIndex) + customStyles + html.substring(headCloseIndex);
}

// Write the modified HTML back to the file
fs.writeFileSync(reportPath, html);

console.log('✅ Screenshots have been configured to expand by default');
console.log('📸 Enhanced styling has been applied to screenshot attachments');
console.log('🔗 Report updated:', reportPath);