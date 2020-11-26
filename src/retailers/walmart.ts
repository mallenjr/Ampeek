import { Browser, BrowserContext, ElementHandle } from 'puppeteer';
import { Item, Scraper } from '../scraper';
import chalk = require("chalk");
import { MessageEmbed, TextChannel } from 'discord.js'; 
import { Purchaser } from '../purchaser';
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
  constructor(browser: BrowserContext, url: string) {
    super(browser, url);
  }

  async login(email: string, password: string) {
    this.page = await this.broswer.newPage();
    await this.page.goto('https://www.walmart.com/account/login');
    await this.page.type('#email', email);
    await this.page.type('#password', password);
    const [button] = await this.page.$x("//button[contains(., 'Sign in')]");
    if (button) {
      await button.click();
    } else {
      return null;
    }

    await this.page.waitForNavigation();
    const cookies = await this.page.cookies();
    return cookies;
  }

  async setup() {
    this.page = await this.broswer.newPage();
    await this.page.goto(this.item_url);
  }

  async buy() {
    const [button] = await this.page.$x('//a[contains(text(), "Add to Cart")]|//button[contains(text(), "Add to Cart")]|//span[contains(text(), "Add to Cart")]|//a[contains(text(), "Add to cart")]|//button[contains(text(), "Add to cart")]|//span[contains(text(), "Add to cart")]');
    if (button) {
      await button.click();
    } else {
      return null;
    }

    await this.page.waitForNavigation();

    const [checkoutButton] = await this.page.$x('//a[contains(text(), "Check Out")]|//button[contains(text(), "Check Out")]|//span[contains(text(), "Check Out")]|//a[contains(text(), "Check out")]|//button[contains(text(), "Check out")]|//span[contains(text(), "Check out")]');
    if (checkoutButton) {
      await checkoutButton.click();
    } else {
      return null;
    }

    await this.page.waitForNavigation();

    const [deliveryButton] = await this.page.$x("//button[contains(., 'Continue')]|//span[contains(., 'Continue')]");
    if (deliveryButton) {
      await deliveryButton.click();
    } else {
      return null;
    }

    await this.page.waitForNavigation();

    const [shippingButton] = await this.page.$x("//button[contains(., 'Continue')]|//span[contains(., 'Continue')]");
    if (shippingButton) {
      await shippingButton.click();
    } else {
      return null;
    }

    await this.page.waitForNavigation();

    await this.page.type('#cvv-confirm', '936');

    const [reviewButton] = await this.page.$x("//button[contains(., 'Review your order')]|//span[contains(., 'Review your order')]");
    if (reviewButton) {
      await reviewButton.click();
    } else {
      return null;
    }

    await this.page.waitForNavigation();

    const [orderButton] = await this.page.$x("//button[contains(., 'Place order')]|//span[contains(., 'Place order')]");
    if (orderButton) {
      await orderButton.click();
    } else {
      return null;
    }

    await this.page.waitForNavigation();
  }
}