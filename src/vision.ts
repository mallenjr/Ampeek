import { Database } from './database';
import { Scrapers } from './retailers';
import * as puppeteer from 'puppeteer';
import { Client, TextChannel } from 'discord.js';
import { sleep } from './utils';
import { Scraper } from './scraper';
import zmq = require("zeromq");

let scrapers = {};

require('dotenv').config();

async function updateScrapers(links: Array<any>, browser: puppeteer.Browser, discordChannel: TextChannel) {
  console.log('Updating scrapers from database..');
  const currentScrapers = Object.keys(scrapers);

  // Add new Scrapers
  for (const index in links) {
    const link = links[index];
    const key = `${link.product_id}-${link.link_id}`;

    // If scraper already already instantiated continue
    if (scrapers[key]) {
      Object.assign(scrapers[key], {
        amount_wanted: link.amount_wanted
      });
      const scraperIndex = currentScrapers.indexOf(key);
      currentScrapers.splice(scraperIndex, 1);
      continue;
    }

    const retailerClass = Scrapers[link.retailer];
    scrapers[key] = {
      instance: new retailerClass(discordChannel, browser, link.url, link.item_name),
      retailer: link.retailer,
      product_id: link.product_id,
      url: link.url,
      amount_wanted: link.amount_wanted
    };
    await scrapers[key].instance.setup();
  }

  console.log('Removing old scrapers');
  // Remove old scrapers
  for (const index in currentScrapers) {
    const scraperKey = currentScrapers[index];
    await scrapers[scraperKey].instance.close();
    delete scrapers[scraperKey].instance;
  }

  return;
}

async function bootstrap() {
  await sleep(1000 * 10);
  const db = new Database('./ampeek.db');
  await db.setup();

  const purchasingQueue = zmq.socket('pub')
  purchasingQueue.bind('tcp://*:8688', function(err) {
    if (err) {
      console.log(err)
      return;
    } else
        console.log("Listening on 8688...")
  });

  const browser = await puppeteer.launch({ headless: true });

  const bot = new Client();

  bot.login(process.env.DISCORD_BOT_TOKEN);

  await (async () => {
    return new Promise(resolve => {
      bot.on('ready', () => {
        resolve(null);
      })
    });
  })();

  const discordChannel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID) as TextChannel;

  const sql = `
    SELECT l.id AS link_id, l.product_id, l.url, r.name AS retailer, p.name AS item_name, p.amount_wanted
    FROM link AS l
    LEFT JOIN product AS p
      ON p.id = l.product_id
    LEFT JOIN retailer AS r
      ON l.retailer_id = r.id
  `;

  while(true) {
    const links: Array<any> = await db.all(sql);
    await updateScrapers(links, browser, discordChannel);
    await Promise.all(Object.keys(scrapers).map((key) => {
      const link = scrapers[key];
      const scraper: Scraper = link.instance;
      return (async () => {
        const inStock = await scraper.checkItemInStock();
        if (inStock) {
          purchasingQueue.send(JSON.stringify({
            url: link.url,
            retailer: link.retailer,
            product_id: link.product_id,
          }));
        }
      })();
    }));
    await sleep(1500);
  }
}

bootstrap();