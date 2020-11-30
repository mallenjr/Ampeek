var zmq = require('zeromq');
var subscriber = zmq.socket('sub');
import * as puppeteer from 'puppeteer';
import { Database } from './lib/database';
import { Purchaser } from './purchaser';
import { Purchasers } from './retailers';
import { WalmartPurchaser } from './retailers/walmart';

let sessions = [];
let active = {};

async function refreshSessions(db: Database, browser: puppeteer.Browser) {
  const sql = `
    SELECT account.email, account.password, retailer.name AS retailer, account.id
    FROM account
    LEFT JOIN retailer
      ON retailer.id = account.retailer_id
  `;

  const accountRecords = await db.all(sql);;

  for (const index in accountRecords) {
    const context = await browser.createIncognitoBrowserContext();
    const account = accountRecords[index];
    const purchaserClass = Purchasers[account.retailer];
    const purchaser: Purchaser = new purchaserClass(context, 'https://walmart.com');
    try {
      const cookies = await purchaser.login(account.email, account.password);
      sessions.push(cookies);
      await purchaser.close();
    } catch (e) {
      await purchaser.close();
    }
  }
}

async function bootstrap() {
  const db = new Database('./ampeek.db');
  await db.setup();

  const browser = await puppeteer.launch({ headless: false });

  await refreshSessions(db, browser);
  const sessionInterval = setInterval(() => refreshSessions(db, browser), 1000 * 60 * 10);

  subscriber.on("message", async function(reply) {
    for (const index in sessions) {
      const item = JSON.parse(reply);
      const session = sessions[index];
      const key = `${item}-${session}`;
      if (active[key]) {
        return;
      }
      active[key] = true;
      const buyContext = await browser.createIncognitoBrowserContext();
      const purchaser = new WalmartPurchaser(buyContext, item.url);
      await purchaser.setup();
      console.log(session);
      await purchaser.setCookies(session);
      await purchaser.buy();
      active[key] = false;
    }
  });

  subscriber.connect("tcp://localhost:8688");
  subscriber.subscribe("");

  process.on('SIGINT', function() {
    subscriber.close()
    console.log('\nClosed')
    clearInterval(sessionInterval);
  });
};

bootstrap();