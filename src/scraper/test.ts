import { Client, TextChannel } from 'discord.js';
import * as puppeteer from 'puppeteer';
// import { AmazonScraper } from './amazon';
// import { BestBuyScraper } from './bestBuy';
import { WalmartScraper } from './walmart';
// import { NeweggScraper } from './newegg';

require('dotenv').config();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bootstrap() {
  const browser = await puppeteer.launch({ headless: false });
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

  // const bestBuyScraper2060 = new BestBuyScraper(discordChannel, browser, 'rtx+2060', 'RTX 2060');
  // await bestBuyScraper2060.setup();

  const walmartScraperPS5 = new WalmartScraper(discordChannel, browser, 'playstation+4&cat_id=2636_1102672_1106096', 'Playstation 5');
  await walmartScraperPS5.setup();

  // const neweggScraper2060 = new NeweggScraper(discordChannel, browser, 'rtx+2060', 'RTX 2060');
  // await neweggScraper2060.setup();

  // const amazonScraper2060 = new AmazonScraper(discordChannel, browser, process.env.AMAZON_SESSION_ID, 'https://www.amazon.com/stores/page/6B204EA4-AAAC-4776-82B1-D7C3BD9DDC82', 'RTX 2060');
  // await amazonScraper2060.setup();

  while (true) {
    await Promise.all([
      // bestBuyScraper2060.getItems(),
      // neweggScraper2060.getItems(),
      // amazonScraper2060.getItems(),
      walmartScraperPS5.getItems(),
    ]);

    const sleep_time = Math.floor((Math.random() * 1200) + 1600);
    // console.log(Math.floor((Math.random() * 1200) + 1500));
    await sleep(sleep_time);
  }
}

bootstrap();
