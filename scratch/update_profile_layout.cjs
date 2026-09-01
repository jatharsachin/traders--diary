const fs = require('fs');
const path = require('path');

// 1. Update App.tsx
const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(/\r\n/g, '\n');

// Target 1: Desktop Left Sidebar profile picture block
const oldDesktopPicBlock = `                {userAvatar && userAvatar.startsWith('data:image/') ? (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '1.2rem' }}>👨‍💻</span>
                )}`;

const newDesktopPicBlock = `                {userAvatar && userAvatar.startsWith('data:image/') ? (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, rgba(6, 182, 212, 0.4) 100%)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {(userName || 'Sachin').charAt(0).toUpperCase()}
                  </div>
                )}`;

if (appContent.indexOf(oldDesktopPicBlock) === -1) {
  console.error("Could not find Desktop Sidebar profile block in App.tsx");
  process.exit(1);
}
appContent = appContent.replace(oldDesktopPicBlock, newDesktopPicBlock);

// Target 2: Top Right Header profile picture block
const oldHeaderPicBlock = `                  <span style={{ display: 'flex', alignItems: 'center', width: '38px', height: '38px', justifyContent: 'center' }}>
                    {userAvatar && userAvatar.startsWith('data:image/') ? (
                      <img 
                        src={userAvatar} 
                        alt="Avatar" 
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '1.9rem' }}>
                        {userAvatar === 'bull' ? '🐂' :
                         userAvatar === 'bear' ? '🐻' :
                         userAvatar === 'trader' ? '👨‍💻' :
                         userAvatar === 'gold' ? '🏆' :
                         userAvatar === 'coin' ? '🪙' :
                         userAvatar === 'clock' ? '⏱️' :
                         userAvatar === 'rocket' ? '🚀' :
                         userAvatar === 'shield' ? '🛡️' : '👨‍💻'}
                      </span>
                    )}
                  </span>`;

const newHeaderPicBlock = `                  <span style={{ display: 'flex', alignItems: 'center', width: '38px', height: '38px', justifyContent: 'center' }}>
                    {userAvatar && userAvatar.startsWith('data:image/') ? (
                      <img 
                        src={userAvatar} 
                        alt="Avatar" 
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary) 0%, rgba(6, 182, 212, 0.4) 100%)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        border: '1.2px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {(userName || 'Sachin').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </span>`;

if (appContent.indexOf(oldHeaderPicBlock) === -1) {
  console.error("Could not find Top Right Header profile block in App.tsx");
  process.exit(1);
}
appContent = appContent.replace(oldHeaderPicBlock, newHeaderPicBlock);

fs.writeFileSync(appPath, appContent, 'utf8');
console.log("Successfully updated App.tsx profile picture layout!");
