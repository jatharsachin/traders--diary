const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TradingCalendar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add formatTimeToAMPM to imports
const oldImport = "import { filterTradesByFY, getCurrentLiveFY } from '../utils/fyHelper';";
const newImport = "import { filterTradesByFY, getCurrentLiveFY, formatTimeToAMPM } from '../utils/fyHelper';";

if (content.indexOf(oldImport) === -1) {
  console.error("Could not find import statement in TradingCalendar.tsx");
  process.exit(1);
}
content = content.replace(oldImport, newImport);

// 2. Replace entryTime td cell with entryTime - exitTime AMPM format
const oldTdCell = `<td style={{ fontWeight: 550, fontSize: '0.78rem' }}>{t.entryTime}</td>`;
const newTdCell = `<td style={{ fontWeight: 550, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{formatTimeToAMPM(t.entryTime)} - {formatTimeToAMPM(t.exitTime)}</td>`;

if (content.indexOf(oldTdCell) === -1) {
  console.error("Could not find entryTime td cell in TradingCalendar.tsx");
  process.exit(1);
}
content = content.replace(oldTdCell, newTdCell);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated TradingCalendar.tsx with dynamic AM/PM times!");
