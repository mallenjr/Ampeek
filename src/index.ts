import * as puppeteer from 'puppeteer';
import { AmazonScraper } from './amazon';
import { BestBuyScraper } from './bestBuy';
import { NeweggScraper } from './newegg';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bootstrap() {
  const browser = await puppeteer.launch({ headless: true });

  process.on('exit', () => {
    browser.close();
  });

  const bestBuyScraper = new BestBuyScraper(browser, '3080');
  await bestBuyScraper.setup();

  const neweggScraper = new NeweggScraper(browser, '3080');
  await neweggScraper.setup();

  const amazonScraper = new AmazonScraper(browser, '138-2766536-6314229', 'https://www.amazon.com/stores/page/6B204EA4-AAAC-4776-82B1-D7C3BD9DDC82');
  await amazonScraper.setup();

  while (true) {
    await Promise.all([
      bestBuyScraper.getItems(),
      neweggScraper.getItems(),
      amazonScraper.getItems(),
    ]);

    await sleep(3000);
  }
}

bootstrap();
