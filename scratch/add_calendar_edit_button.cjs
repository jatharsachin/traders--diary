const fs = require('fs');
const path = require('path');

// 1. Update App.tsx
const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(/\r\n/g, '\n');

const oldCalRender = "{activeTab === 'calendar' && <TradingCalendar activeAccountId={activeAccountId} />}";
const newCalRender = `{activeTab === 'calendar' && (
          <TradingCalendar 
            activeAccountId={activeAccountId} 
            onEditTrade={handleEditTrade} 
          />
        )}`;

if (appContent.indexOf(oldCalRender) === -1) {
  console.error("Could not find TradingCalendar render block in App.tsx");
  process.exit(1);
}
appContent = appContent.replace(oldCalRender, newCalRender);
fs.writeFileSync(appPath, appContent, 'utf8');
console.log("Successfully updated App.tsx!");

// 2. Update TradingCalendar.tsx
const calPath = path.join(__dirname, '..', 'src', 'components', 'TradingCalendar.tsx');
let calContent = fs.readFileSync(calPath, 'utf8');
calContent = calContent.replace(/\r\n/g, '\n');

// Update imports
const oldCalImports = "import { ChevronLeft, ChevronRight, Info, Eye, EyeOff } from 'lucide-react';";
const newCalImports = "import { ChevronLeft, ChevronRight, Info, Eye, EyeOff, Edit2 } from 'lucide-react';";

if (calContent.indexOf(oldCalImports) === -1) {
  console.error("Could not find lucide-react imports in TradingCalendar.tsx");
  process.exit(1);
}
calContent = calContent.replace(oldCalImports, newCalImports);

// Update signature
const oldCalSig = "export function TradingCalendar({ activeAccountId = 'Combined' }: { activeAccountId?: string }) {";
const newCalSig = `export function TradingCalendar({ 
  activeAccountId = 'Combined',
  onEditTrade
}: { 
  activeAccountId?: string;
  onEditTrade?: (id: string) => void;
}) {`;

if (calContent.indexOf(oldCalSig) === -1) {
  console.error("Could not find component signature in TradingCalendar.tsx");
  process.exit(1);
}
calContent = calContent.replace(oldCalSig, newCalSig);

// Update table header (add Actions header)
const oldTableHeader = `                    <th>Setup/Mistake</th>
                    <th>Notes</th>
                  </tr>`;

const newTableHeader = `                    <th>Setup/Mistake</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>`;

if (calContent.indexOf(oldTableHeader) === -1) {
  console.error("Could not find table header block in TradingCalendar.tsx");
  process.exit(1);
}
calContent = calContent.replace(oldTableHeader, newTableHeader);

// Update table body row (add Edit button cell)
const oldTableRow = `                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} title={t.notes}>
                        {t.notes || '-'}
                      </td>
                    </tr>`;

const newTableRow = `                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} title={t.notes}>
                        {t.notes || '-'}
                      </td>
                      <td>
                        {onEditTrade && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTrade(t.id);
                            }}
                            className="btn btn-secondary"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '0.72rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Edit Trade"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>`;

if (calContent.indexOf(oldTableRow) === -1) {
  console.error("Could not find table row end block in TradingCalendar.tsx");
  process.exit(1);
}
calContent = calContent.replace(oldTableRow, newTableRow);

fs.writeFileSync(calPath, calContent, 'utf8');
console.log("Successfully updated TradingCalendar.tsx!");
