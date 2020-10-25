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

  const bestBuyScraper = new BestBuyScraper(discordChannel, browser, 'rtx+3080');
  await bestBuyScraper.setup();

  const neweggScraper = new NeweggScraper(discordChannel, browser, 'rtx+3080');
  await neweggScraper.setup();

  const amazonScraper = new AmazonScraper(discordChannel, browser, process.env.AMAZON_SESSION_ID, 'https://www.amazon.com/stores/page/6B204EA4-AAAC-4776-82B1-D7C3BD9DDC82');
  await amazonScraper.setup();

  while (true) {
    await Promise.all([
      bestBuyScraper.getItems(),
      neweggScraper.getItems(),
      amazonScraper.getItems(),
    ]);

    const sleep_time = Math.floor((Math.random() * 1200) + 1800);
    await sleep(sleep_time);
  }
}

bootstrap();
