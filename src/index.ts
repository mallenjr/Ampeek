import { Client, TextChannel } from 'discord.js';
import * as puppeteer from 'puppeteer';
import { sleep } from './utils';
// import { AmazonScraper } from './amazon';
import { BestBuyScraper } from './bestBuy';
import { WalmartScraper } from './walmart';
// import { NeweggScraper } from './newegg';

require('dotenv').config();

async function bootstrap() {
  const browser = await puppeteer.launch({ headless: true });
  const bot = new Client();

  bot.login(process.env.DISCORD_BOT_TOKEN);

  await (async () => {
    return new Promise(resolve => {
      bot.on('ready', () => {
        resolve();
      })
    });
  })();

  const discordChannel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID) as TextChannel;

  process.on('exit', () => {
    browser.close();
  });

  const bestBuyPlaystationScraper = new BestBuyScraper(discordChannel, browser, 'playstation 5-console&qp=features_facet%3DFeatures~High Dynamic Range (HDR)', 'Playstation 5');
  await bestBuyPlaystationScraper.setup();

  const walmartPlaystationScraper = new WalmartScraper(discordChannel, browser, 'playstation+5+console&cat_id=2636_3475115_2762884&facet=retailer%3AWalmart.com', 'Playstation 5');
  await walmartPlaystationScraper.setup();

  while (true) {
    await Promise.all([
      bestBuyPlaystationScraper.getItems(),
      walmartPlaystationScraper.getItems(),
    ]);

    const sleep_time = Math.floor((Math.random() * 1200) + 500);
    await sleep(sleep_time);
  }
}

bootstrap();
