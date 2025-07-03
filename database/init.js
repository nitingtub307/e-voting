const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'voting.db');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          voter_id TEXT UNIQUE NOT NULL,
          role TEXT DEFAULT 'voter',
          is_verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create elections table
      db.run(`
        CREATE TABLE IF NOT EXISTS elections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          status TEXT DEFAULT 'upcoming',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create candidates table
      db.run(`
        CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          election_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          party TEXT,
          manifesto TEXT,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (election_id) REFERENCES elections (id)
        )
      `);

      // Create votes table
      db.run(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          election_id INTEGER NOT NULL,
          voter_id INTEGER NOT NULL,
          candidate_id INTEGER NOT NULL,
          vote_hash TEXT UNIQUE NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (election_id) REFERENCES elections (id),
          FOREIGN KEY (voter_id) REFERENCES users (id),
          FOREIGN KEY (candidate_id) REFERENCES candidates (id)
        )
      `);

      // Create admin user if not exists
      db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          const adminPassword = 'admin123'; // Change this in production
          bcrypt.hash(adminPassword, 10, (err, hash) => {
            if (err) {
              reject(err);
              return;
            }
            
            db.run(`
              INSERT INTO users (username, email, password_hash, full_name, voter_id, role, is_verified)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['admin', 'admin@evoting.com', hash, 'System Administrator', 'ADMIN001', 'admin', 1], (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('Admin user created successfully');
                resolve();
              }
            });
          });
        } else {
          resolve();
        }
      });
    });
  });
}

function getDatabase() {
  return db;
}

module.exports = {
  initializeDatabase,
  getDatabase
}; 