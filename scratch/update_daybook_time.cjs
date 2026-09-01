const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'DayBook.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add formatTimeToAMPM import statement at the beginning of the file (e.g. after line 1)
const oldImport = "import { useState } from 'react';";
const newImport = `import { useState } from 'react';
import { formatTimeToAMPM } from '../utils/fyHelper';`;

if (content.indexOf(oldImport) === -1) {
  console.error("Could not find useState import in DayBook.tsx");
  process.exit(1);
}
content = content.replace(oldImport, newImport);

// 2. Replace ⏱️ {item.time} with ⏱️ {formatTimeToAMPM(item.time)}
const oldTimeSpan = `⏱️ {item.time}`;
const newTimeSpan = `⏱️ {formatTimeToAMPM(item.time)}`;

if (content.indexOf(oldTimeSpan) === -1) {
  console.error("Could not find ⏱️ {item.time} span in DayBook.tsx");
  process.exit(1);
}
content = content.replace(oldTimeSpan, newTimeSpan);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated DayBook.tsx with dynamic AM/PM times!");
