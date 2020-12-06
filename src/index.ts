import { Client, TextChannel } from 'discord.js';
import * as puppeteer from 'puppeteer';
import { sleep } from './utils/utils';
// import { AmazonScraper } from './retailers/amazon';
import { BestBuyScraper } from './retailers/bestBuy';
import { WalmartScraper } from './retailers/walmart';
// import { NeweggScraper } from './newegg';

require('dotenv').config();

async function bootstrap() {
  const browser = await puppeteer.launch({ headless: false });
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

  process.on('exit', () => {
    browser.close();
  });

  const bestBuyPlaystationScraper = new BestBuyScraper(discordChannel, browser, 'playstation 5-console&qp=features_facet%3DFeatures~High Dynamic Range (HDR)', 'Playstation 5');
  await bestBuyPlaystationScraper.setup();

  const walmartPlaystationScraper = new WalmartScraper(discordChannel, browser, 'playstation+5+console&cat_id=2636_3475115_2762884&facet=retailer%3AWalmart.com', 'Playstation 5');
  await walmartPlaystationScraper.setup();

  // const amazonPlaystationScraper = new AmazonScraper(discordChannel, browser, '00', 'https://www.amazon.com/s?k=Lightning+Speed&i=videogames&rh=n%3A20972796011%2Cp_n_availability%3A1238048011&dc&qid=1605740509&rnid=1237984011&ref=sr_nr_p_n_availability_2', 'Playstation 5');
  // await amazonPlaystationScraper.setup();

  while (true) {
    await Promise.all([
      bestBuyPlaystationScraper.getItems(),
      walmartPlaystationScraper.getItems(),
      // amazonPlaystationScraper.getItems(),
    ]);

    const sleep_time = Math.floor((Math.random() * 1200) + 500);
    await sleep(sleep_time);
  }
}

bootstrap();
