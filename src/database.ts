import { Database as SQLiteDatabase } from 'sqlite3';

export class Database {
  readonly db: SQLiteDatabase;
  
  constructor(file_path: string) {
    this.db = new SQLiteDatabase(file_path, (err) => {
      if (err) {
        console.log('Could not connect to database');
      }
    });
  }

  async createProductsTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      retailers TEXT,
      count INTEGER,
      queries TEXT,
      max_price INTEGER,
      activated BOOLEAN NOT NULL CHECK (activated IN (0,1)) DEFAULT 1
    )
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          console.log('Failed to add items table to the database');
          reject(err);
        }
        resolve();
      });
    });
  }

  async setup() {
    await this.createProductsTable();
  }

  async run(sql: string, params: Array<any>) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      })
    })
  }
}

export default Database;