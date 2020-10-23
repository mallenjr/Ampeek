import * as puppeteer from 'puppeteer';
import * as notifier from 'node-notifier';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function amazonCheck(): Promise<string | null> {
  console.log('checking amazon....');
  const link = 'https://www.amazon.com/stores/GeForce/RTX3080_GEFORCERTX30SERIES/page/6B204EA4-AAAC-4776-82B1-D7C3BD9DDC82';
  // Wait for browser launching.
  const browser = await puppeteer.launch({ headless: true });
  // Wait for creating the new page.
  const page = await browser.newPage();

  const tablet = puppeteer.devices['iPad landscape']
  await page.emulate(tablet)

  await page.goto(link);

  await sleep(500);

  const inStockItems = await page.$x("//button/div/span[contains(text(), 'Add to Cart')]|//a/div/span[contains(text(), 'See buying options')]");

  if (inStockItems.length > 0) {
    notifier.notify({
      title: '3080 stock',
      message: `Amazon 3080 stock. items: ${inStockItems.length}\n${link}`,
      sound: true,
    });
  }

  browser.close();

  console.log('amazon check finished');

  return null;
}

async function neweggCheck(): Promise<string | null> {
  console.log('checking newegg....');
  const link = 'https://www.newegg.com/p/pl?d=rtx+3080';
  // Wait for browser launching.
  const browser = await puppeteer.launch({ headless: true });
  // Wait for creating the new page.
  const page = await browser.newPage();

  const tablet = puppeteer.devices['iPad landscape']
  await page.emulate(tablet)

  await page.goto(link);

  await sleep(500);

  const inStockItems = await page.$x("//button[contains(text(), 'Add to cart')]");

  if (inStockItems.length > 0) {
    notifier.notify({
      title: '3080 stock',
      message: `Newegg 3080 stock. items: ${inStockItems.length}\n${link}`,
      sound: true,
    });
  }

  browser.close();

  console.log('newegg check finished');

  return null;
}

async function bbCheck(): Promise<string | null> {
  console.log('checking best buy....');
  const link = 'https://www.bestbuy.com/site/searchpage.jsp?st=rtx+3080&_dyncharset=UTF-8&_dynSessConf=&id=pcat17071&type=page&sc=Global&cp=1&nrp=&sp=&qp=&list=n&af=true&iht=y&usc=All+Categories&ks=960&keys=keys';
  // Wait for browser launching.
  const browser = await puppeteer.launch({ headless: true });
  // Wait for creating the new page.
  const page = await browser.newPage();

  const tablet = puppeteer.devices['iPad landscape']
  await page.emulate(tablet)

  await page.goto(link);

  await sleep(500);

  const inStockItems = await page.$x("//button[contains(text(), 'Add to Cart')]");

  if (inStockItems.length > 0) {
    notifier.notify({
      title: '3080 stock',
      message: `Best Buy 3080 stock. items: ${inStockItems.length}\n${link}`,
      sound: true,
    });
  }

  browser.close();

  console.log('best buy check finished');

  return null;
}

async function bootstrap() {
  while (true) {
    await Promise.all([
      amazonCheck(),
      neweggCheck(),
      bbCheck(),
    ]);

    sleep(6000);
  }
}

bootstrap();
