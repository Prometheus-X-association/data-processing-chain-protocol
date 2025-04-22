const { spawn } = require('child_process');
const args = process.argv.slice(2);
let type = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type' && i + 1 < args.length) {
    type = args[i + 1];
    break;
  }
}
const connectors = [
  { port: 8887, uid: 'connector-initiator' },
  { port: 8888, uid: 'remote-connector1' },
  { port: 8889, uid: 'remote-connector2' },
  { port: 8890, uid: 'remote-connector3' },
  { port: 8891, uid: 'remote-connector4' },
];

console.log('Launching connectors...');

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const children = [];
const readyConnectors = new Set();

connectors.forEach(({ port, uid }) => {
  const spawnArgs = ['dev'];
  if (type) {
    spawnArgs.push('--type', type);
  }
  spawnArgs.push('--port', port.toString(), '--connector_uid', uid);
  
  const child = spawn(command, spawnArgs, { 
    shell: true
  });
  
  children.push(child);
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
    const output = data.toString();
    if (output.includes(`Connector UID: ${uid}`)) {
      readyConnectors.add(port);
      if (readyConnectors.size === connectors.length) {
        setTimeout(() => {
          console.log('\n===========================================');
          console.log('All connectors ready!');
          console.log('===========================================\n');
        }, 100);
      }
    }
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  child.on('error', (error) => {
    console.error(`Error launching connector on port ${port}:`, error);
  });
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Connector on port ${port} exited with code ${code}`);
    }
  });
});

process.on('SIGINT', () => {
  console.log('\nStopping all pnpm processes...');
  children.forEach(child => child.kill());
  process.exit();
});

