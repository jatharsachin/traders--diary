const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Replace new Date(a.date) and new Date(t.date) usages that cause timezone offset bugs
const replacer1 = `
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
};
`;

if (content.indexOf("const parseLocalDate") === -1) {
  content = content.replace("export function Dashboard({", replacer1 + "\nexport function Dashboard({");
}

// Now replace new Date(t.date) and new Date(a.date) and new Date(dateStr) with parseLocalDate where appropriate
content = content.replace(/new Date\(a\.date\)/g, "parseLocalDate(a.date)");
content = content.replace(/new Date\(t\.date\)/g, "parseLocalDate(t.date)");
content = content.replace(/new Date\(firstDate\)/g, "parseLocalDate(firstDate)");
content = content.replace(/new Date\(dateStr\)/g, "parseLocalDate(dateStr)");
content = content.replace(/new Date\(sortedTrades\[0\]\?\.date \|\| new Date\(\)\)/g, "parseLocalDate(sortedTrades[0]?.date || new Date().toISOString().split('T')[0])");
content = content.replace(/new Date\(sortedTrades\[0\]\.date\)/g, "parseLocalDate(sortedTrades[0].date)");
content = content.replace(/new Date\(capitalAdjustments\[0\]\.date\)/g, "parseLocalDate(capitalAdjustments[0].date)");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully fixed Dashboard timezone comparisons!");
