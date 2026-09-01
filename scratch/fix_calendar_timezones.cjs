const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TradingCalendar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Fix getCurrentWeekPnL
const oldWeekPnL = `  const getCurrentWeekPnL = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(today.setDate(diffToMon));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weeklyTrades = trades.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= monday && tDate <= sunday;
    });

    return weeklyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };`;

const newWeekPnL = `  const getCurrentWeekPnL = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(today);
    monday.setDate(diffToMon);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatD = (d: Date) => \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
    const monStr = formatD(monday);
    const sunStr = formatD(sunday);

    const weeklyTrades = trades.filter((t) => t.date >= monStr && t.date <= sunStr);

    return weeklyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };`;

content = content.replace(oldWeekPnL, newWeekPnL);

// 2. Fix FY Range variables and filter
const oldFYRangeBlock = `  // Get active financial year start and end dates based on currentDate (month and year)
  const getFYRange = () => {
    let fyStartYear = year;
    if (month < 3) { // Jan, Feb, Mar belong to previous calendar year's FY
      fyStartYear = year - 1;
    }
    const start = new Date(fyStartYear, 3, 1); // April 1st
    const end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999); // March 31st next year
    return { start, end, fyStartYear };
  };
  const { start: fyStart, end: fyEnd, fyStartYear } = getFYRange();

  const getFYPnL = () => {
    const fyTrades = trades.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= fyStart && tDate <= fyEnd;
    });
    return fyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };
  const activeFYPnL = getFYPnL();

  const getActiveMonthDeployed = () => {
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const monthPrefix = \`\${year}-\${formattedMonth}-\`;
    const monthlyTrades = trades.filter((t) => t.date.startsWith(monthPrefix));
    return monthlyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0);
  };

  const getFYDeployed = () => {
    const fyTrades = trades.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= fyStart && tDate <= fyEnd;
    });
    return fyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0);
  };`;

const newFYRangeBlock = `  // Get active financial year start and end dates based on currentDate (month and year)
  const getFYRange = () => {
    let fyStartYear = year;
    if (month < 3) { // Jan, Feb, Mar belong to previous calendar year's FY
      fyStartYear = year - 1;
    }
    const startStr = \`\${fyStartYear}-04-01\`;
    const endStr = \`\${fyStartYear + 1}-03-31\`;
    return { startStr, endStr, fyStartYear };
  };
  const { startStr: fyStartStr, endStr: fyEndStr, fyStartYear } = getFYRange();

  const getFYPnL = () => {
    const fyTrades = trades.filter((t) => t.date >= fyStartStr && t.date <= fyEndStr);
    return fyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };
  const activeFYPnL = getFYPnL();

  const getActiveMonthDeployed = () => {
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const monthPrefix = \`\${year}-\${formattedMonth}-\`;
    const monthlyTrades = trades.filter((t) => t.date.startsWith(monthPrefix));
    return monthlyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0);
  };

  const getFYDeployed = () => {
    const fyTrades = trades.filter((t) => t.date >= fyStartStr && t.date <= fyEndStr);
    return fyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0);
  };`;

content = content.replace(oldFYRangeBlock, newFYRangeBlock);

// 3. Fix processWeeks for annual view (monthly calculation bug)
const oldMonthlyProcess = `      if (fyTrades.length > 0) {
        const tDate = new Date(t.date);
        return tDate >= mStart && tDate <= mEnd;
      }`;
const newMonthlyProcess = `      if (fyTrades.length > 0) {
        const mStartStr = \`\${mYear}-\${String(mMonthIndex + 1).padStart(2, '0')}-01\`;
        const lastDay = new Date(mYear, mMonthIndex + 1, 0).getDate();
        const mEndStr = \`\${mYear}-\${String(mMonthIndex + 1).padStart(2, '0')}-\${String(lastDay).padStart(2, '0')}\`;
        return t.date >= mStartStr && t.date <= mEndStr;
      }`;
if (content.indexOf("const tDate = new Date(t.date);") !== -1 && content.indexOf("return tDate >= mStart && tDate <= mEnd;") !== -1) {
  content = content.replace(`        const tDate = new Date(t.date);
        return tDate >= mStart && tDate <= mEnd;`, 
`        const mStartStr = \`\${mYear}-\${String(mMonthIndex + 1).padStart(2, '0')}-01\`;
        const lastDay = new Date(mYear, mMonthIndex + 1, 0).getDate();
        const mEndStr = \`\${mYear}-\${String(mMonthIndex + 1).padStart(2, '0')}-\${String(lastDay).padStart(2, '0')}\`;
        return t.date >= mStartStr && t.date <= mEndStr;`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully fixed TradingCalendar timezone comparisons!");
