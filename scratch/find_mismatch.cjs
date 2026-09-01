const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Simple regex tag extractor
const tagRegex = /<\/?([a-zA-Z0-9\-]+)(?:\s+[^>]*?)?>/g;
let match;
const stack = [];

// Let's analyze only the region we replaced, i.e., from {/* Header Bar */} to the end of the navigation.
const startAnchor = '      {/* Header Bar */}';
const endAnchor = '      {/* Main Tab Render Panels */}';

const startIndex = content.indexOf(startAnchor);
const endIndex = content.indexOf(endAnchor);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find boundaries");
  process.exit(1);
}

const snippet = content.substring(startIndex, endIndex);

// Let's extract all tags
const tags = [];
let re = /<\/?([a-zA-Z0-9:]+|header|nav|div|span|h1|select|option|button|img|strong|p|span|ShieldCheck|LayoutDashboard|BookOpen|Calendar|History|Receipt|Briefcase|Compass|Percent|Plus|Bell|Sun|Moon|LogOut|ShieldCheck)(?:\s+[^>]*?)?(\/?)>/g;

while ((match = re.exec(snippet)) !== null) {
  const fullTag = match[0];
  const tagName = match[1];
  const isSelfClosing = match[2] === '/' || fullTag.endsWith('/>');
  const isClosing = fullTag.startsWith('</');
  
  if (isSelfClosing) {
    // Self closing tags are fine
    continue;
  }
  
  tags.push({ name: tagName, closing: isClosing, raw: fullTag });
}

console.log("Analyzing tag balance...");
const activeStack = [];
for (const tag of tags) {
  if (tag.closing) {
    if (activeStack.length === 0) {
      console.warn(`Unopened closing tag: ${tag.raw}`);
    } else {
      const top = activeStack.pop();
      if (top.name !== tag.name) {
        console.warn(`Mismatched tags! Opened: ${top.raw}, Closed: ${tag.raw}`);
      }
    }
  } else {
    activeStack.push(tag);
  }
}

if (activeStack.length > 0) {
  console.warn("Unclosed tags remaining:");
  for (const t of activeStack) {
    console.warn(`- ${t.raw}`);
  }
} else {
  console.log("All tags inside snippet are perfectly balanced!");
}
