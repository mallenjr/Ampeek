import { Browser, ElementHandle } from 'puppeteer';
import { Item, Scraper } from '../classes/scraper';
import chalk = require("chalk");
import { MessageEmbed, TextChannel } from 'discord.js'; 
import { Purchaser } from '../classes/purchaser';
import { Task } from '../classes/task';
import WalmartEncrypt from '../utils/walmart_encrypt';
// import { sleep } from '../utils';

export class WalmartScraper extends Scraper {
  constructor(discord_channel: TextChannel, browser: Browser, url: string, item_name: string, cooldown_time: number = 15000, max_price: number = 1000.00) {
    super(discord_channel, browser, url, cooldown_time, max_price, ['networkidle2']);
    this.selector = '//a[contains(text(), "Add to Cart")]|//button[contains(text(), "Add to Cart")]|//span[contains(text(), "Add to Cart")]|//a[contains(text(), "Add to cart")]|//button[contains(text(), "Add to cart")]|//span[contains(text(), "Add to cart")]';
    this.retailer = 'Walmart';
    this.chalkHeader = chalk.bold.whiteBright;
    this.item_name = item_name;
  }

  async getPriceFromElement(element: ElementHandle): Promise<number> {
    const price_string = await (await (await element.$('.price > .visuallyhidden')).getProperty('innerText')).jsonValue() as string;
    const price = parseFloat(price_string.substr(1));
    return price;
  }

  async getLinkFromElement(element: ElementHandle): Promise<string> {
    const link = await (await (await element.$('.search-result-productimage')).getProperty('href')).jsonValue() as string;
    return link;
  }

  async getNameFromElement(element: ElementHandle): Promise<string> {
    const title = await (await (await element.$('.product-title-link > span')).getProperty('innerText')).jsonValue() as string;
    return title;
  }

  async addItemToEmbed(itemEmbed: MessageEmbed, item: Item) {
    itemEmbed.addField(`${item.name}`, `$${item.price}`)
      .addFields(
        { name: 'Item Link', value: item.link }
      )
  }

  async printItem(item: Item) {
    console.log(chalk.bold.green("$" + item.price), " | ", chalk.blue(item.link));
  }
}

export class WalmartPurchaser extends Purchaser {
  constructor(browser: Browser, url: string) {
    super(browser, url);
    this.retailer = 'walmart';
  }

  async buy(): Promise<boolean> {
    const [button] = await this.page.$x('//a[contains(text(), "Add to Cart")]|//button[contains(text(), "Add to Cart")]|//span[contains(text(), "Add to Cart")]|//a[contains(text(), "Add to cart")]|//button[contains(text(), "Add to cart")]|//span[contains(text(), "Add to cart")]');
    if (button) {
      await button.click();
    } else {
      return false;
    }

    await this.page.waitForNavigation({ waitUntil: ['networkidle2'] });
    if (!await this.setProxy()) {
      return false;
    }
    const [checkoutButton] = await this.page.$x('//a[contains(text(), "Check Out")]|//button[contains(text(), "Check Out")]|//span[contains(text(), "Check Out")]|//a[contains(text(), "Check out")]|//button[contains(text(), "Check out")]|//span[contains(text(), "Check out")]');
    if (checkoutButton) {
      await checkoutButton.click();
    } else {
      return false;
    }

    await this.page.waitForNavigation({ waitUntil: ['networkidle2'] });
    if (!await this.setProxy()) {
      return false;
    }

    const [deliveryButton] = await this.page.$x('//a[contains(text(), "Continue")]|//button[contains(text(), "Continue")]|//span[contains(text(), "Continue")]|//a[contains(text(), "Continue")]|//button[contains(text(), "Continue")]|//span[contains(text(), "Continue")]');
    if (deliveryButton) {
      await deliveryButton.click();
    } else {
      return false;
    }

    await this.page.waitForNavigation({ waitUntil: ['networkidle2'] });
    if (!await this.setProxy()) {
      return false;
    }

    const [shippingButton] = await this.page.$x('//a[contains(text(), "Continue")]|//button[contains(text(), "Continue")]|//span[contains(text(), "Continue")]|//a[contains(text(), "Continue")]|//button[contains(text(), "Continue")]|//span[contains(text(), "Continue")]');
    if (shippingButton) {
      await shippingButton.click();
    } else {
      return false;
    }

    await this.page.waitForNavigation();
    if (!await this.setProxy()) {
      return false;
    }

    await this.page.type('#cvv-confirm', '936');

    const [reviewButton] = await this.page.$x("//button[contains(., 'Review your order')]|//span[contains(., 'Review your order')]");
    if (reviewButton) {
      await reviewButton.click();
    } else {
      return false;
    }

    await this.page.waitForNavigation();
    return true;

    // const [orderButton] = await this.page.$x("//button[contains(., 'Place order')]|//span[contains(., 'Place order')]");
    // if (orderButton) {
    //   await orderButton.click();
    // } else {
    //   return null;
    // }

    // await this.page.waitForNavigation();
  }
}

export async function walmartLogin(username: string, password: string, broswer: Browser) {
  const context = await broswer.createIncognitoBrowserContext()
  const page = await context.newPage();
  await page.goto('https://www.walmart.com/account/login');
  await page.type('#email', username);
  await page.type('#password', password);
  const [button] = await page.$x("//button[contains(., 'Sign in')]");
  if (button) {
    await button.click();
  } else {
    return null;
  }

  try {
    await page.waitForNavigation();
  } catch (e) {
    console.log(`Login failed for account [${username}] on retailer [walmart]`);
    await page.close();
    return null;
  }
  const cookies = await page.cookies();
  await page.close();
  return cookies;
}

export class WalmartTask extends Task {
  constructor(browser: Browser, url: string, name: string, retailer: string, max_purchase_amount: number = 1) {
    super(browser, url, name, retailer, max_purchase_amount, ['domcontentloaded']);
    this.blockedHosts = [];
  }

  async captcha(): Promise<boolean> {
    const url = new URL(this.page.url()).toString();
    return url.indexOf('/blocked') > 0;
  }

  async checkItemInStock(): Promise<boolean> {
    const inStockSelector = '//a[contains(text(), "Add to Cart")]|//button[contains(text(), "Add to Cart")]|//span[contains(text(), "Add to Cart")]|//a[contains(text(), "Add to cart")]|//button[contains(text(), "Add to cart")]|//span[contains(text(), "Add to cart")]';
    const inStockButton = await this.page.$x(inStockSelector);
    return inStockButton.length > 0;
  }
}