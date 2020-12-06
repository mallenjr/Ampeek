import { Browser, ElementHandle } from 'puppeteer';
import { Scraper } from '../classes/scraper';
import chalk = require("chalk");
import { TextChannel } from 'discord.js';
import { sleep } from '../utils/utils';

export class BestBuyScraper extends Scraper {
  constructor(discord_channel: TextChannel, browser: Browser, url: string, item_name: string = 'RTX 2060', cooldown_time: number = 15000, max_price: number = 1000.00) {
    super(discord_channel, browser, url, cooldown_time, max_price)
    this.selector = '//a[contains(text(), "Add to Cart")]|//button[contains(text(), "Add to Cart")]|//span[contains(text(), "Add to Cart")]';
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