const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'store', 'useTradeStore.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Replace state definition theme property type
const oldThemeProp = "  theme: 'light' | 'dark' | 'emerald' | 'cyberpunk' | 'nordic';";
const newThemeProp = "  theme: 'light' | 'dark';";

if (content.indexOf(oldThemeProp) === -1) {
  console.error("Could not find theme property type in useTradeStore.ts");
  process.exit(1);
}
content = content.replace(oldThemeProp, newThemeProp);

// 2. Replace setTheme parameter type
const oldSetThemeSig = "  setTheme: (theme: 'light' | 'dark' | 'emerald' | 'cyberpunk' | 'nordic') => void;";
const newSetThemeSig = "  setTheme: (theme: 'light' | 'dark') => void;";

if (content.indexOf(oldSetThemeSig) === -1) {
  console.error("Could not find setTheme signature in useTradeStore.ts");
  process.exit(1);
}
content = content.replace(oldSetThemeSig, newSetThemeSig);

// 3. Replace loadTheme function signature and return statement
const oldLoadThemeBlock = `  const loadTheme = (): 'light' | 'dark' | 'emerald' | 'cyberpunk' | 'nordic' => {
    const saved = localStorage.getItem('traders_diary_theme');
    return (saved && ['light', 'dark', 'emerald', 'cyberpunk', 'nordic'].includes(saved)) ? (saved as any) : 'dark';
  };`;

const newLoadThemeBlock = `  const loadTheme = (): 'light' | 'dark' => {
    const saved = localStorage.getItem('traders_diary_theme');
    return (saved && ['light', 'dark'].includes(saved)) ? (saved as any) : 'dark';
  };`;

if (content.indexOf(oldLoadThemeBlock) === -1) {
  console.error("Could not find loadTheme block in useTradeStore.ts");
  process.exit(1);
}
content = content.replace(oldLoadThemeBlock, newLoadThemeBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully restricted themes to dark/light in useTradeStore.ts!");
