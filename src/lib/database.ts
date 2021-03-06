import { Database as SQLiteDatabase } from 'sqlite3';
import { Retailers } from '../retailers'; 
export class Database {
  private readonly db: SQLiteDatabase;
  private lastID: number;
  
  constructor(file_path: string) {
    this.db = new SQLiteDatabase(file_path, (err) => {
      if (err) {
        console.log('Could not connect to database');
      }
    });
  }

  async createTaskTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS task (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      retailer_id INTEGER NOT NULL,
      task_amount INTEGER NOT NULL,
      purchase_amount INTEGER NOT NULL,
      max_price INTEGER NOT NULL,
      url TEXT NOT NULL,
      activated BOOLEAN NOT NULL CHECK (activated IN (0,1)) DEFAULT 1,
      running BOOLEAN NOT NULL CHECK (activated IN (0,1)) DEFAULT 0,
      FOREIGN KEY (retailer_id)
        REFERENCES retailer (id)
    )
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          console.log('Failed to add products table to the database');
          reject(err);
        }
        resolve(null);
      });
    });
  }

  async createAccountsTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      retailer_id INTEGER NOT NULL,
      in_use BOOLEAN NOT NULL CHECK (in_use IN (0,1)) DEFAULT 0,
      leased_until INTEGER,
      session TEXT,
      session_expires INTEGER,
      FOREIGN KEY (retailer_id)
        REFERENCES retailer (id)
    )
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          console.log('Failed to add account table to the database');
          reject(err);
        }
        resolve(null);
      });
    });
  }

  async resetAccounts() {
    let sql = `
      UPDATE account
      SET in_use = 0
      WHERE in_use = 1;
    `;

    await this.run(sql);
  }

  async createRetailersTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS retailer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      UNIQUE (name)
    );
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, err => {
        if (err) {
          console.log('Failed to add retailers table to the database');
          reject(err);
        }
        resolve(null);
      });
    });
  }

  async populateRetailersTable() {
    try {
      let sql = '';
      for(const retailer in Retailers) {
        sql = `
          INSERT OR IGNORE INTO retailer (name) VALUES("${Retailers[retailer]}");
        `;

        await this.run(sql);
      }
    } catch (e) {
      console.log('Failed to populate retailers table');
      console.log(e);
      throw new Error();
    }
  }

  async setup() {
    try {
      await this.createTaskTable();
      await this.createRetailersTable();
      await this.populateRetailersTable();
      await this.createAccountsTable();
      await this.resetAccounts();
    } catch (e) {
      console.log(e);
      throw new Error();
    }
  }

  async run(sql: string, params: Array<any> = []): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: any, err: any, result: unknown) {
        if (err) {
          reject(err);
        }
        resolve(this?.lastID);
      });
    });
  }

  async get(sql: string) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, (err, result) => {
        if (err) {
          console.log('Failed to execute sql query');
          reject (err);
        }
        resolve(result);
      })
    })
  }

  async all(sql: string): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err, rows) => {
        if (err) {
          console.log('Failed to execute all sqlite command');
          reject (err);
        }
        resolve(rows);
      })
    })
  }

  getLastID() {
    return this.lastID;
  }
}

export default Database;