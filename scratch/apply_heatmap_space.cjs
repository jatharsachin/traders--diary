const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

const oldGridBlock = `        {/* Calendar Heatmap Grid wrapper */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '780px' }}>
            {/* Column 1: Weekday Labels */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(5, 12px)', 
              gap: '4px',
              marginRight: '12px',
              marginTop: '22px', // offsets down to align with rows (header offset)
              userSelect: 'none'
            }}>
              <div style={{ gridRowStart: 1, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Mon</div>
              <div style={{ gridRowStart: 2, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Tue</div>
              <div style={{ gridRowStart: 3, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Wed</div>
              <div style={{ gridRowStart: 4, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Thu</div>
              <div style={{ gridRowStart: 5, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Fri</div>
            </div>

            {/* Months Row Container with Gaps */}
            <div style={{ display: 'flex', gap: '20px' }}>
              {monthsData.map((m, mIdx) => (
                <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Month name label */}
                  <div style={{ 
                    fontSize: '0.68rem', 
                    color: 'var(--text-dim)', 
                    textAlign: 'left', 
                    fontWeight: 600,
                    userSelect: 'none'
                  }}>
                    {m.name}
                  </div>

                  {/* Monthly grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateRows: 'repeat(5, 12px)',
                    gridAutoFlow: 'column',
                    gap: '4px'
                  }}>
                    {/* Padding cells */}
                    {Array.from({ length: m.startPad }).map((_, idx) => (
                      <div 
                        key={\`pad-\${idx}\`} 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '2px', 
                          background: 'transparent' 
                        }} 
                      />
                    ))}

                    {/* Day cells */}
                    {m.dates.map((dateStr) => {
                      const stats = dailyStats[dateStr];
                      const isNoTrade = noTradeDays.includes(dateStr);
                      let bgColor = 'rgba(120, 120, 120, 0.08)';
                      let border = '1px solid var(--border-color)';
                      let title = \`\${dateStr}: No trades logged\`;
                      
                      if (stats && stats.count > 0) {
                        if (stats.pnl > 0) {
                          const opacity = Math.max(0.2, Math.min(1.0, stats.pnl / maxWin));
                          bgColor = \`rgba(48, 209, 88, \${opacity})\`;
                          border = '1px solid rgba(48, 209, 88, 0.4)';
                          title = \`\${dateStr}: \${stats.count} trades | Net PnL: +₹\${stats.pnl.toLocaleString('en-IN')}\`;
                        } else if (stats.pnl < 0) {
                          const opacity = Math.max(0.2, Math.min(1.0, Math.abs(stats.pnl) / maxLoss));
                          bgColor = \`rgba(255, 69, 58, \${opacity})\`;
                          border = '1px solid rgba(255, 69, 58, 0.4)';
                          title = \`\${dateStr}: \${stats.count} trades | Net PnL: -₹\${Math.abs(stats.pnl).toLocaleString('en-IN')}\`;
                        } else {
                          bgColor = 'rgba(120, 120, 120, 0.3)';
                          title = \`\${dateStr}: \${stats.count} trades | Net PnL: ₹0\`;
                        }
                      } else if (isNoTrade) {
                        bgColor = 'rgba(59, 130, 246, 0.25)';
                        border = '1px solid rgba(59, 130, 246, 0.4)';
                        title = \`\${dateStr}: No-Trade Day (Disciplined)\`;
                      }
                      
                      return (
                        <div 
                          key={dateStr}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '2px',
                            background: bgColor,
                            border: border,
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease'
                          }}
                          onClick={() => setSelectedHeatmapDate(dateStr)} className="heatmap-cell"
                          title={isPnlVisible ? title : title.replace(/Net PnL: [+-]₹\\d+/, 'Net P&L: Hidden')}
                        />
                      );
                    })}`;

const newGridBlock = `        {/* Calendar Heatmap Grid wrapper */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '1020px' }}>
            {/* Column 1: Weekday Labels */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(5, 16px)', 
              gap: '5px',
              marginRight: '14px',
              marginTop: '28px', // offsets down to align with rows (header offset)
              userSelect: 'none'
            }}>
              <div style={{ gridRowStart: 1, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Mon</div>
              <div style={{ gridRowStart: 2, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Tue</div>
              <div style={{ gridRowStart: 3, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Wed</div>
              <div style={{ gridRowStart: 4, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Thu</div>
              <div style={{ gridRowStart: 5, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Fri</div>
            </div>

            {/* Months Row Container with Gaps */}
            <div style={{ display: 'flex', gap: '30px' }}>
              {monthsData.map((m, mIdx) => (
                <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Month name label */}
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-dim)', 
                    textAlign: 'left', 
                    fontWeight: 700,
                    userSelect: 'none'
                  }}>
                    {m.name}
                  </div>

                  {/* Monthly grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateRows: 'repeat(5, 16px)',
                    gridAutoFlow: 'column',
                    gap: '5px'
                  }}>
                    {/* Padding cells */}
                    {Array.from({ length: m.startPad }).map((_, idx) => (
                      <div 
                        key={\`pad-\${idx}\`} 
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          borderRadius: '3px', 
                          background: 'transparent' 
                        }} 
                      />
                    ))}

                    {/* Day cells */}
                    {m.dates.map((dateStr) => {
                      const stats = dailyStats[dateStr];
                      const isNoTrade = noTradeDays.includes(dateStr);
                      let bgColor = 'rgba(120, 120, 120, 0.08)';
                      let border = '1px solid var(--border-color)';
                      let title = \`\${dateStr}: No trades logged\`;
                      
                      if (stats && stats.count > 0) {
                        if (stats.pnl > 0) {
                          const opacity = Math.max(0.2, Math.min(1.0, stats.pnl / maxWin));
                          bgColor = \`rgba(48, 209, 88, \${opacity})\`;
                          border = '1px solid rgba(48, 209, 88, 0.4)';
                          title = \`\${dateStr}: \${stats.count} trades | Net PnL: +₹\${stats.pnl.toLocaleString('en-IN')}\`;
                        } else if (stats.pnl < 0) {
                          const opacity = Math.max(0.2, Math.min(1.0, Math.abs(stats.pnl) / maxLoss));
                          bgColor = \`rgba(255, 69, 58, \${opacity})\`;
                          border = '1px solid rgba(255, 69, 58, 0.4)';
                          title = \`\${dateStr}: \${stats.count} trades | Net PnL: -₹\${Math.abs(stats.pnl).toLocaleString('en-IN')}\`;
                        } else {
                          bgColor = 'rgba(120, 120, 120, 0.3)';
                          title = \`\${dateStr}: \${stats.count} trades | Net PnL: ₹0\`;
                        }
                      } else if (isNoTrade) {
                        bgColor = 'rgba(59, 130, 246, 0.25)';
                        border = '1px solid rgba(59, 130, 246, 0.4)';
                        title = \`\${dateStr}: No-Trade Day (Disciplined)\`;
                      }
                      
                      return (
                        <div 
                          key={dateStr}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            background: bgColor,
                            border: border,
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease'
                          }}
                          onClick={() => setSelectedHeatmapDate(dateStr)} className="heatmap-cell"
                          title={isPnlVisible ? title : title.replace(/Net PnL: [+-]₹\\d+/, 'Net P&L: Hidden')}
                        />
                      );
                    })}`;

if (content.indexOf(oldGridBlock) === -1) {
  console.error("Could not find oldGridBlock in Dashboard.tsx");
  process.exit(1);
}
content = content.replace(oldGridBlock, newGridBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Dashboard.tsx heatmap cell sizes successfully adjusted to 16px and gaps updated!");
