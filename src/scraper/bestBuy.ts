import { Browser, ElementHandle } from 'puppeteer';
import { Scraper } from './scraper';
import chalk = require("chalk");
import { TextChannel } from 'discord.js';
import { sleep } from './utils';

export class BestBuyScraper extends Scraper {
  constructor(discord_channel: TextChannel, browser: Browser, item_query_param: string = 'rtx+2060', item_name: string = 'RTX 2060', cooldown_time: number = 15000, max_price: number = 1000.00) {
    const url = `https://www.bestbuy.com/site/searchpage.jsp?st=${item_query_param}&_dyncharset=UTF-8&_dynSessConf=&id=pcat17071&type=page&sc=Global&cp=1&nrp=&sp=&qp=&list=n&af=true&iht=y&usc=All+Categories&ks=960&keys=keys`
    super(discord_channel, browser, url, cooldown_time, max_price, ['networkidle2'])
    this.selector = '//a[contains(text(), "See Details")]/ancestor::li[contains(concat(" ", normalize-space(@class), " "), " sku-item ")]\
      |//button[contains(text(), "Add to Cart")]/ancestor::li[contains(concat(" ", normalize-space(@class), " "), " sku-item ")]';
    this.retailer = 'Best Buy';
    this.chalkHeader = chalk.bold.blue;
    this.item_name = item_name;
  }

  async getSkuFromElement(element: ElementHandle): Promise<string> {
    const skuEl = (await element.$$('.sku-value'))[1];
    if (!skuEl) {
      return '';
    }
    const sku = (await (await (skuEl.getProperty('innerText'))).jsonValue()) as string;
    return sku;
  }

  async getNameFromElement(element: ElementHandle): Promise<string> {
    const title = await (await (await element.$('.sku-title > h4 > a')).getProperty('innerText')).jsonValue() as string;
    return title;
  }

  async getPriceFromElement(element: ElementHandle): Promise<number> {
    const price_string = await (await (await element.$('.priceView-customer-price > span')).getProperty('innerText')).jsonValue() as string;
    const price = parseFloat(price_string.substr(1));
    return price;
  }

  async getLinkFromElement(element: ElementHandle): Promise<string> {
    const link = await (await (await element.$('.sku-title > h4 > a')).getProperty('href')).jsonValue() as string;
    return link;
  }

  async inStock(element: ElementHandle): Promise<boolean> {
    try {
      const outOfStockEl = await element.$('.fulfillment-fulfillment-summary > div > div > div > strong');
      if (!outOfStockEl) {
        return true;
      }
      const inStock = await (await (outOfStockEl).getProperty('innerText')).jsonValue() as string;
      return inStock === 'Sold Out';
    } catch (e) {
      return false;
    }
  }

  getCheckoutLinkFromSku(sku: string) {
    return `https://api.bestbuy.com/click/-/${sku}/cart`;
  }

  async preparseWait(): Promise<void> {
    await sleep(600);
    return;
  }
}