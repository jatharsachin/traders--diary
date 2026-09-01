import { execSync } from 'child_process';

try {
  const output = execSync('netstat -ano | findstr :5173').toString();
  const lines = output.split('\n').filter(Boolean);
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0') {
      try {
        execSync(`taskkill /F /PID ${pid}`);
        console.log(`Successfully killed process ${pid} on port 5173`);
      } catch (e) {
        console.log(`Process ${pid} already closed`);
      }
    }
  });
} catch (e) {
  console.log('Port 5173 is clean and free.');
}
