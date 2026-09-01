const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TradeLogger.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Insert helper function getFYDateLimits after usePartialExits hook declaration
const targetAnchor = "  const [usePartialExits, setUsePartialExits] = useState(false);";
const replacement = `  const [usePartialExits, setUsePartialExits] = useState(false);

  const getFYDateLimits = () => {
    if (selectedFY && selectedFY !== 'All') {
      const match = selectedFY.match(/FY (\\d{4})/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        return {
          min: \`\${startYear}-04-01\`,
          max: \`\${startYear + 1}-03-31\`
        };
      }
    }
    return { min: undefined, max: undefined };
  };
  const fyLimits = getFYDateLimits();`;

if (content.indexOf(targetAnchor) === -1) {
  console.error("Could not find usePartialExits hook declaration in TradeLogger.tsx");
  process.exit(1);
}
content = content.replace(targetAnchor, replacement);

// 2. Replace hardcoded min and max attributes in date inputs
// Replace in date input
const oldDateInput = `                <input
                  type="date"
                  name="date"
                  min="2026-04-01"
                  max="2027-03-31"`;

const newDateInput = `                <input
                  type="date"
                  name="date"
                  min={fyLimits.min}
                  max={fyLimits.max}`;

if (content.indexOf(oldDateInput) === -1) {
  console.error("Could not find the main date input pattern in TradeLogger.tsx");
  process.exit(1);
}
content = content.replace(oldDateInput, newDateInput);

// Replace in exitDate input
const oldExitDateInput = `                  <input
                    type="date"
                    name="exitDate"
                    min="2026-04-01"
                    max="2027-03-31"`;

const newExitDateInput = `                  <input
                    type="date"
                    name="exitDate"
                    min={fyLimits.min}
                    max={fyLimits.max}`;

if (content.indexOf(oldExitDateInput) === -1) {
  console.error("Could not find the exit date input pattern in TradeLogger.tsx");
  process.exit(1);
}
content = content.replace(oldExitDateInput, newExitDateInput);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully set dynamic financial year constraints in TradeLogger.tsx!");
