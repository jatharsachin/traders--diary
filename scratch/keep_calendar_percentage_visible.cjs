const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TradingCalendar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF line endings
content = content.replace(/\r\n/g, '\n');

// 1. Day cells P&L format (around line 359)
const oldDayPnlBlock = `              {isPnlVisible ? (
                <>
                  <span className="pnl-desktop">
                    {summary.netPnL > 0 ? '+' : ''}
                    {Math.round(summary.netPnL).toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.62rem', opacity: 0.85, marginLeft: '2.5px' }}>
                      ({summary.netPnL >= 0 ? '+' : ''}{dayRoi.toFixed(1)}%)
                    </span>
                  </span>
                  <span className="pnl-mobile">
                    {formatCompactPnLMobile(summary.netPnL)}
                  </span>
                </>
              ) : (
                '••••'
              )}`;

const newDayPnlBlock = `              <>
                <span className="pnl-desktop">
                  {isPnlVisible ? (summary.netPnL > 0 ? '+' : '') : ''}
                  {isPnlVisible ? Math.round(summary.netPnL).toLocaleString('en-IN') : '••••'}
                  <span style={{ fontSize: '0.62rem', opacity: 0.85, marginLeft: '2.5px' }}>
                    ({summary.netPnL >= 0 ? '+' : ''}{dayRoi.toFixed(1)}%)
                  </span>
                </span>
                <span className="pnl-mobile">
                  {isPnlVisible ? formatCompactPnLMobile(summary.netPnL) : (
                    <>
                      ••••
                      <span style={{ fontSize: '0.58rem', opacity: 0.85, marginLeft: '2px' }}>
                        ({summary.netPnL >= 0 ? '+' : ''}{dayRoi.toFixed(1)}%)
                      </span>
                    </>
                  )}
                </span>
              </>`;

if (content.indexOf(oldDayPnlBlock) === -1) {
  console.error("Could not find oldDayPnlBlock in TradingCalendar.tsx");
  process.exit(1);
}
content = content.replace(oldDayPnlBlock, newDayPnlBlock);

// 2. Weekly cells P&L format (around line 1041)
const oldWeekPnlBlock = `              {isPnlVisible ? (
                <>
                  <span className="pnl-desktop">
                    {w.netPnL > 0 ? '+' : ''}
                    {Math.round(w.netPnL).toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '2px' }}>
                      ({w.netPnL >= 0 ? '+' : ''}{weekRoi.toFixed(1)}%)
                    </span>
                  </span>
                  <span className="pnl-mobile">
                    {formatCompactPnLMobile(w.netPnL)}
                  </span>
                </>
              ) : (
                '••••'
              )}`;

const newWeekPnlBlock = `              <>
                <span className="pnl-desktop">
                  {isPnlVisible ? (w.netPnL > 0 ? '+' : '') : ''}
                  {isPnlVisible ? Math.round(w.netPnL).toLocaleString('en-IN') : '••••'}
                  <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '2px' }}>
                    ({w.netPnL >= 0 ? '+' : ''}{weekRoi.toFixed(1)}%)
                  </span>
                </span>
                <span className="pnl-mobile">
                  {isPnlVisible ? formatCompactPnLMobile(w.netPnL) : (
                    <>
                      ••••
                      <span style={{ fontSize: '0.58rem', opacity: 0.85, marginLeft: '2px' }}>
                        ({w.netPnL >= 0 ? '+' : ''}{weekRoi.toFixed(1)}%)
                      </span>
                    </>
                  )}
                </span>
              </>`;

if (content.indexOf(oldWeekPnlBlock) === -1) {
  console.error("Could not find oldWeekPnlBlock in TradingCalendar.tsx");
  process.exit(1);
}
content = content.replace(oldWeekPnlBlock, newWeekPnlBlock);

// 3. Monthly cells P&L format (around line 1148)
const oldMonthPnlBlock = `              {isPnlVisible ? (
                <>
                  <span className="pnl-desktop">
                    {m.netPnL > 0 ? '+' : ''}
                    {Math.round(m.netPnL).toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '2px' }}>
                      ({m.netPnL >= 0 ? '+' : ''}{monthRoi.toFixed(1)}%)
                    </span>
                  </span>
                  <span className="pnl-mobile">
                    {formatCompactPnLMobile(m.netPnL)}
                  </span>
                </>
              ) : (
                '••••'
              )}`;

const newMonthPnlBlock = `              <>
                <span className="pnl-desktop">
                  {isPnlVisible ? (m.netPnL > 0 ? '+' : '') : ''}
                  {isPnlVisible ? Math.round(m.netPnL).toLocaleString('en-IN') : '••••'}
                  <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '2px' }}>
                    ({m.netPnL >= 0 ? '+' : ''}{monthRoi.toFixed(1)}%)
                  </span>
                </span>
                <span className="pnl-mobile">
                  {isPnlVisible ? formatCompactPnLMobile(m.netPnL) : (
                    <>
                      ••••
                      <span style={{ fontSize: '0.58rem', opacity: 0.85, marginLeft: '2px' }}>
                        ({m.netPnL >= 0 ? '+' : ''}{monthRoi.toFixed(1)}%)
                      </span>
                    </>
                  )}
                </span>
              </>`;

if (content.indexOf(oldMonthPnlBlock) === -1) {
  console.error("Could not find oldMonthPnlBlock in TradingCalendar.tsx");
  process.exit(1);
}
content = content.replace(oldMonthPnlBlock, newMonthPnlBlock);

// 4. Header P&L badge (around line 1253)
const oldHeaderPnlBlock = `              {isPnlVisible ? (
                <>
                  {headerPnL >= 0 ? '+' : ''}{formatCurrency(headerPnL)} ({headerPnL >= 0 ? '+' : ''}{headerRoi.toFixed(1)}%)
                </>
              ) : (
                '••••'
              )}`;

const newHeaderPnlBlock = `              <>
                {isPnlVisible ? (
                  <>
                    {headerPnL >= 0 ? '+' : ''}{formatCurrency(headerPnL)}
                  </>
                ) : (
                  '••••'
                )}{' '}
                ({headerPnL >= 0 ? '+' : ''}{headerRoi.toFixed(1)}%)
              </>`;

if (content.indexOf(oldHeaderPnlBlock) === -1) {
  console.error("Could not find oldHeaderPnlBlock in TradingCalendar.tsx");
  process.exit(1);
}
content = content.replace(oldHeaderPnlBlock, newHeaderPnlBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log("TradingCalendar.tsx percentage returns logic successfully adjusted!");
