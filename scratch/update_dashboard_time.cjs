const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add formatTimeToAMPM to imports
const oldImport = "import { filterTradesByFY } from '../utils/fyHelper';";
const newImport = "import { filterTradesByFY, formatTimeToAMPM } from '../utils/fyHelper';";

if (content.indexOf(oldImport) === -1) {
  console.error("Could not find import statement in Dashboard.tsx");
  process.exit(1);
}
content = content.replace(oldImport, newImport);

// 2. Replace entryTime td cell with entryTime - exitTime AMPM format
const oldTdCell = `<td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{t.entryTime}</td>`;
const newTdCell = `<td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>{formatTimeToAMPM(t.entryTime)} - {formatTimeToAMPM(t.exitTime)}</td>`;

if (content.indexOf(oldTdCell) === -1) {
  console.error("Could not find entryTime td cell in Dashboard.tsx");
  process.exit(1);
}
content = content.replace(oldTdCell, newTdCell);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated Dashboard.tsx with dynamic AM/PM times!");
