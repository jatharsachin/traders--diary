const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'fyHelper.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// Append formatTimeToAMPM function to the end of the file
const ampmFunction = `
export function formatTimeToAMPM(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  
  if (isNaN(hours)) return timeStr;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const formattedHours = hours.toString().padStart(2, '0');
  
  return \`\${formattedHours}:\${minutes} \${ampm}\`;
}
`;

if (content.indexOf("formatTimeToAMPM") !== -1) {
  console.log("formatTimeToAMPM is already defined in fyHelper.ts");
} else {
  content += ampmFunction;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully appended formatTimeToAMPM to fyHelper.ts!");
}
