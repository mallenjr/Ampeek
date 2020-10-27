import { Client, TextChannel } from 'discord.js';
import * as puppeteer from 'puppeteer';
import { AmazonScraper } from './amazon';
import { BestBuyScraper } from './bestBuy';
import { NeweggScraper } from './newegg';

require('dotenv').config();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  const bestBuyScraper3080 = new BestBuyScraper(discordChannel, browser, 'rtx+3080', 'RTX 3080');
  await bestBuyScraper3080.setup();

  const bestBuyScraper3070 = new BestBuyScraper(discordChannel, browser, 'rtx+3070', 'RTX 3070');
  await bestBuyScraper3070.setup();

  const neweggScraper3080 = new NeweggScraper(discordChannel, browser, 'rtx+3080', 'RTX 3080');
  await neweggScraper3080.setup();

  const neweggScraper3070 = new NeweggScraper(discordChannel, browser, 'rtx+3070', 'RTX 3070');
  await neweggScraper3070.setup();

  const amazonScraper3080 = new AmazonScraper(discordChannel, browser, process.env.AMAZON_SESSION_ID, 'https://www.amazon.com/stores/page/6B204EA4-AAAC-4776-82B1-D7C3BD9DDC82', 'RTX 3080');
  await amazonScraper3080.setup();

  const amazonScraper3070 = new AmazonScraper(discordChannel, browser, process.env.AMAZON_SESSION_ID, 'https://www.amazon.com/stores/page/127E4131-DA71-49E3-902E-C382ABEC4AC3', 'RTX 3070');
  await amazonScraper3070.setup();

  while (true) {
    await Promise.all([
      bestBuyScraper3080.getItems(),
      bestBuyScraper3070.getItems(),
      neweggScraper3080.getItems(),
      amazonScraper3080.getItems(),
      amazonScraper3070.getItems(),
      neweggScraper3070.getItems(),
    ]);

    const sleep_time = Math.floor((Math.random() * 1200) + 1600);
    await sleep(sleep_time);
  }
}

bootstrap();
