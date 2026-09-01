const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TradeTable.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add formatTimeToAMPM to imports
const oldImport = "import { filterTradesByFY } from '../utils/fyHelper';";
const newImport = "import { filterTradesByFY, formatTimeToAMPM } from '../utils/fyHelper';";

if (content.indexOf(oldImport) === -1) {
  console.error("Could not find import statement in TradeTable.tsx");
  process.exit(1);
}
content = content.replace(oldImport, newImport);

// 2. Replace {trade.entryTime} - {trade.exitTime} with formatTimeToAMPM
const oldTimeBlock = `{trade.entryTime} - {trade.exitTime}`;
const newTimeBlock = `{formatTimeToAMPM(trade.entryTime)} - {formatTimeToAMPM(trade.exitTime)}`;

if (content.indexOf(oldTimeBlock) === -1) {
  console.error("Could not find {trade.entryTime} - {trade.exitTime} block in TradeTable.tsx");
  process.exit(1);
}
content = content.replace(oldTimeBlock, newTimeBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated TradeTable.tsx with dynamic AM/PM times!");
