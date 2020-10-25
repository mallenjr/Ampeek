import { Browser, ElementHandle } from "puppeteer";
import { Scraper } from "./scraper";
import chalk = require("chalk");

export class NeweggScraper extends Scraper {
  constructor(discord_channel, browser: Browser, item_query_pram: string = 'rtx+2060', cooldown_time: number = 15000, max_price: number = 1000.00) {
    const url = `https://www.newegg.com/p/pl?d=${item_query_pram}&N=100007709%204841&isdeptsrh=1`;
    super(discord_channel, browser, url, cooldown_time, max_price);
    this.selector = '//button[contains(text(), "Add to cart")]/ancestor::div[contains(concat(" ", normalize-space(@class), " "), " item-cell ")]';
    this.retailer = 'Newegg';
    this.chalkHeader = chalk.bold.yellow;
  }

  async getSkuFromElement(element: ElementHandle): Promise<string> {
    const link = await (await (await element.$('.item-title')).getProperty('href')).jsonValue() as string;
    const sku = link.substring(link.indexOf('/p/') + 3, link.indexOf('?Des'));
    return sku;
  }

  async getNameFromElement(element: ElementHandle): Promise<string> {
    const title = await (await (await element.$('.item-title')).getProperty('innerText')).jsonValue() as string;
    return title;
  }

  async getLinkFromElement(element: ElementHandle): Promise<string> {
    const link = await (await (await element.$('.item-title')).getProperty('href')).jsonValue() as string;
    return link;
  }

  async getPriceFromElement(element: ElementHandle): Promise<number> {
    const price_dollars = await (await (await element.$('.price-current > strong')).getProperty('innerText')).jsonValue() as string;
    const price_cents = await (await (await element.$('.price-current > sup')).getProperty('innerText')).jsonValue() as string;
    const price = parseFloat(`${price_dollars}${price_cents}`);
    return price;
  }

  getCheckoutLinkFromSku(sku: string) {
    return `https://secure.newegg.com/Shopping/AddtoCart.aspx?Submit=ADD&ItemList=${sku}`;
  }
}