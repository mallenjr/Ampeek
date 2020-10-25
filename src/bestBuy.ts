import { Browser, ElementHandle } from 'puppeteer';
import { Scraper } from './scraper';
import chalk = require("chalk");

export class BestBuyScraper extends Scraper {
  constructor(browser: Browser, item_query_param: string = '2060', cooldown_time: number = 10000, max_price: number = 1000.00) {
    const url = `https://www.bestbuy.com/site/searchpage.jsp?st=rtx+${item_query_param}&_dyncharset=UTF-8&_dynSessConf=&id=pcat17071&type=page&sc=Global&cp=1&nrp=&sp=&qp=&list=n&af=true&iht=y&usc=All+Categories&ks=960&keys=keys`
    super(browser, url, cooldown_time, max_price)
    this.selector = '//button[contains(text(), "Add to Cart")]/ancestor::li[contains(concat(" ", normalize-space(@class), " "), " sku-item ")]';
    this.retailer = 'Best Buy';
    this.chalkHeader = chalk.bold.blue;
  }

  async getSkuFromElement(element: ElementHandle): Promise<string> {
    const sku = await (await (await element.$$('.sku-value'))[1].getProperty('innerText')).jsonValue() as string;
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

  getCheckoutLinkFromSku(sku: string) {
    return `https://api.bestbuy.com/click/-/${sku}/cart`;
  }
}