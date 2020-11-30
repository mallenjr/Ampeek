import { Reply } from "zeromq";
import Database from "./database";
import { LoginFunctions } from '../retailers';
import { Browser } from "puppeteer";

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

function formatDateString(date: Date) {
  const time = `${date.getHours()}${date.getMinutes() + 30}`;
  const day = `${date.getFullYear()}${date.getMonth()}${date.getDay()}`;
  return `${day}${time}`;
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

    let sql = '';

    for (const index in accounts) {
      const account = accounts[index];
      console.log(`Logging into account [${account.email}] on retailer [${account.retailer}]`);
      const session = await LoginFunctions[account.retailer](account.email, account.password, browser);
      if (!session) {
        continue;
      }
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 30)

      sql = `
        UPDATE account
        SET session = '${JSON.stringify(session)}',
          session_expires = ${formatDateString(expires)}
        WHERE id = ${account.id}
      `;

      await db.run(sql);

      console.log(`Session refreshed for account [${account.email}] on retailer [${account.retailer}]`);
    }
  } catch (e) {
    console.log(e);
  }

}

async function bootstrap() {
  const sock = new Reply();
  await sock.bind('tcp://*:8689');

  const db = new Database('./ampeek.db');
  await db.setup();

  const browser = await puppeteer.launch({ headless: false });

  await updateSessions(db, browser);
  const sessionInterval = setInterval(() => updateSessions(db, browser), 1000 * 60 * 5); // 5 minutes

  process.on('SIGINT', function() {
    sock.close();
    clearInterval(sessionInterval);
    console.log('\nClosed');
  });

  for await (const [topic, msg] of sock) {
    console.log(topic);
    await sock.send('response' + msg);
  }
}

bootstrap();