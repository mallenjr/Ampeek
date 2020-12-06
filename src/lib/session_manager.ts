import { Reply } from "zeromq";
import Database from "./database";
import { LoginFunctions } from '../retailers';
import { Browser } from "puppeteer";

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

interface Retailers {
  [key: string]: number
};

const retailers: Retailers = {};

function formatDateString(date: Date) {
  const time = `${date.getHours()}${date.getMinutes() + 30}`;
  const day = `${date.getFullYear()}${date.getMonth()}${date.getDay()}`;
  return `${day}${time}`;
}

async function getRetailers(db: Database) {
  let sql = `
    SELECT *
    FROM retailer
    LIMIT 0, 49999;
  `;

  const dbRetailers: Array<any> = await db.all(sql);

  dbRetailers.map(row => {
    retailers[row['name']] = row['id'];
  });
}

async function getAccounts(db: Database) {
  const sql = `
    SELECT account.email, account.password, retailer.name AS retailer, account.id, account.session_expires
    FROM account
    LEFT JOIN retailer
      ON retailer.id = account.retailer_id
    WHERE account.session_expires < ${formatDateString(new Date())}
      OR account.session_expires IS NULL
  `;

  const accountRecords = await db.all(sql);
  return accountRecords;
}

async function updateSessions(db: Database, browser: Browser) {
  console.log('Updating account sessions');
  try {
    const accounts = await getAccounts(db);

    for (const index in accounts) {
      const account = accounts[index];
      await refreshSession(db, browser, account);
    }
  } catch (e) {
    console.log(e);
  }

}

async function refreshSession(db:Database, browser: Browser, account: any) {
  console.log(`Logging into account [${account.email}] on retailer [${account.retailer}]`);
  const session = await LoginFunctions[account.retailer](account.email, account.password, browser);
  if (!session) {
    return false;
  }
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 30)

  const sql = `
    UPDATE account
    SET session = '${JSON.stringify(session)}',
      session_expires = ${formatDateString(expires)}
    WHERE id = ${account.id}
  `;

  await db.run(sql);

  console.log(`Session refreshed for account [${account.email}] on retailer [${account.retailer}]`);
  return true;
}

async function getSessionForRetailer(db: Database, retailer: string) {
  let sql = `
    SELECT *
    FROM account
    WHERE in_use = 0
      AND retailer_id = ${retailers[retailer]}
  `;

  const account: any = await db.get(sql);
  
  if (!account) {
    return 'error';
  }

  sql = `
    UPDATE account
    SET in_use = 1
    WHERE id = ${account.id}
  `;

  await db.run(sql);
  return JSON.stringify({
    session: account.session,
    id: account.id
  });
}

async function releaseSession(db: Database, browser: Browser, id: string): Promise<boolean> {
  try {

    // let sql = `
    //   SELECT account.email, account.password, retailer.name AS retailer, account.id, account.session_expires
    //   FROM account
    //   LEFT JOIN retailer
    //     ON retailer.id = account.retailer_id
    //   WHERE account.id = ${id}
    // `;

    // const account = await db.get(sql);

    // await refreshSession(db, browser, account);

    const sql = `
      UPDATE account
      SET in_use = 0
      WHERE id = ${id}
    `;

    await db.run(sql);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function bootstrap() {
  const sock = new Reply();
  await sock.bind('tcp://*:8689');

  const db = new Database('./ampeek.db');
  await db.setup();

  await getRetailers(db);

  const browser = await puppeteer.launch({ headless: true });

  await updateSessions(db, browser);
  const sessionInterval = setInterval(() => updateSessions(db, browser), 1000 * 60 * 5); // 5 minutes

  process.on('SIGINT', function() {
    sock.close();
    clearInterval(sessionInterval);
    console.log('\nClosed');
  });

  for await (const [_topic, _msg] of sock) {
    const topic = _topic.toString();
    const msg = _msg.toString();
    switch (topic) {
      case 'request':
        const session = await getSessionForRetailer(db, msg);
        await sock.send(session);
        break;
      case 'release':
        const released = await releaseSession(db, browser, msg);
        if (released)
          await sock.send('success');
        else
          await sock.send('error');
        break;
      default:
        await sock.send('error');
    }
  }
}

bootstrap();