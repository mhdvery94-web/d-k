const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const RETENTION_DAYS = 30;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function backupDatabase() {
  const dateStr = getDateString();
  const backupFile = path.join(BACKUP_DIR, `dapur_kemas_backup_${dateStr}.sql`);
  
  // Parse DATABASE_URL to get connection details
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }
  
  // Extract database name from URL
  const urlMatch = dbUrl.match(/\/([^/?]+)(\?|$)/);
  if (!urlMatch) {
    console.error('Could not parse database name from DATABASE_URL');
    process.exit(1);
  }
  const dbName = urlMatch[1];
  
  // MySQL dump command
  const command = `mysqldump ${dbUrl} > "${backupFile}"`;
  
  console.log(`Starting database backup: ${backupFile}`);
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup failed: ${error.message}`);
      console.error(`stderr: ${stderr}`);
      process.exit(1);
    }
    
    if (stderr) {
      console.warn(`Warning: ${stderr}`);
    }
    
    console.log(`Backup completed successfully: ${backupFile}`);
    
    // Get file size
    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`Backup size: ${sizeMB} MB`);
    
    // Clean up old backups
    cleanupOldBackups();
  });
}

function cleanupOldBackups() {
  console.log(`Cleaning up backups older than ${RETENTION_DAYS} days...`);
  
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  let deletedCount = 0;
  
  files.forEach(file => {
    if (!file.startsWith('dapur_kemas_backup_') || !file.endsWith('.sql')) {
      return;
    }
    
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24); // Age in days
    
    if (fileAge > RETENTION_DAYS) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup: ${file} (${fileAge.toFixed(1)} days old)`);
      deletedCount++;
    }
  });
  
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} old backup(s)`);
  } else {
    console.log('No old backups to clean up');
  }
}

function listBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('dapur_kemas_backup_') && file.endsWith('.sql'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('No backups found');
    return;
  }
  
  console.log(`\nFound ${files.length} backup(s):\n`);
  
  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const date = new Date(stats.mtimeMs).toLocaleString('id-ID');
    
    console.log(`  ${file}`);
    console.log(`    Size: ${sizeMB} MB`);
    console.log(`    Created: ${date}`);
    console.log('');
  });
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'backup':
    backupDatabase();
    break;
  case 'list':
    listBackups();
    break;
  case 'cleanup':
    cleanupOldBackups();
    break;
  default:
    console.log('Database Backup Script');
    console.log('');
    console.log('Usage:');
    console.log('  node backup-db.js backup    - Create a new backup');
    console.log('  node backup-db.js list      - List all backups');
    console.log('  node backup-db.js cleanup   - Remove old backups');
    break;
}
