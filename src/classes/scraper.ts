import { Browser, Page, devices, ElementHandle, LoadEvent } from "puppeteer";
import { ChalkFunction } from 'chalk';
import chalk = require("chalk");
import * as notifier from 'node-notifier';
import { MessageEmbed, TextChannel } from "discord.js";

export interface Item {
  price: number,
  checkout_link: string,
  name: string,
  retailer: string;
  link: string;
}

export abstract class Scraper {
  private readonly userAgent = devices['iPad landscape'];

  private readonly broswer: Browser;
  private readonly cooldown_time: number;
  private readonly max_price: number;
  private readonly load_conditions: LoadEvent[];

  protected readonly url: string;
  protected readonly discord_channel: TextChannel;
  protected selector: string;
  protected retailer: string;
  protected item_name: string;
  protected chalkHeader: ChalkFunction;

  private page: Page;
  private last_hit: Date;


  constructor(discord_channel: TextChannel, browser: Browser, url: string, cooldown_time: number, max_price: number, load_conditions: LoadEvent[] = ["load"]) {
    this.broswer = browser;
    this.url = url;
    this.cooldown_time = cooldown_time;
    this.max_price = max_price;
    this.load_conditions = load_conditions;
    this.discord_channel = discord_channel;
  }

  async setup() {
    this.page = await this.broswer.newPage();
    await this.page.emulate(this.userAgent);
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      if (request.resourceType() === 'script')
        request.abort();
      else
        request.continue();
    });
    await this.page.goto(this.url);
  }

  async close() {
    await this.page.close();
  }

  async getSkuFromElement(element: ElementHandle): Promise<string> {
    return 'This function should be overridden.';
  }

  async getNameFromElement(element: ElementHandle): Promise<string> {
    return 'This function should be overridden.';
  }

  async getPriceFromElement(element: ElementHandle): Promise<number> {
    return 0;
  }

  async getLinkFromElement(element: ElementHandle): Promise<string> {
    return 'This function should be overriden.';
  }

  async inStock(element: ElementHandle): Promise<boolean> {
    return true;
  }

  async preparseWait(): Promise<void> {
    return;
  }

  getCheckoutLinkFromSku(sku: string): string {
    return 'This function should be overridden';
  }

  async checkItemInStock(): Promise<boolean> {
    if (this.last_hit && new Date().getTime() < this.last_hit.getTime() + this.cooldown_time) {
      console.log(`Cooldown active for ${this.retailer}. Skipping scrape.`);
      return false;
    }

    console.log(`\nFetching item (${this.item_name}) from: `, this.chalkHeader(this.retailer));
    try {
      await this.page.reload({ waitUntil: this.load_conditions });
    } catch (e) {
      console.log(e);
      console.log(`Failed fetching item (${this.item_name}) from: ${this.retailer}`);
      return false;
    }

    await this.preparseWait();

    const inStockButton = await this.page.$x(this.selector);

    console.log(`\nFinished fetching item (${this.item_name}) from: `, this.chalkHeader(this.retailer));
    
    return inStockButton.length > 0;
  }

  async getItems(): Promise<Array<Item>> {
    if (this.last_hit && new Date().getTime() < this.last_hit.getTime() + this.cooldown_time) {
      console.log(`Cooldown active for ${this.retailer}. Skipping scrape.`);
      return [];
    }

    console.log(`\nFetching item (${this.item_name}) from: `, this.chalkHeader(this.retailer));
    try {
      await this.page.reload({ waitUntil: this.load_conditions });
    } catch (e) {
      console.log(e);
      console.log(`Failed fetching item (${this.item_name}) from: ${this.retailer}`);
      return [];
    }

    await this.preparseWait();

    const elements = await this.page.$x(this.selector);
    let validItems: Array<Item> = [];

    for (const element of elements) {
      if (!(await this.inStock(element))) {
        continue;
      }
      const sku = await this.getSkuFromElement(element);
      const checkout_link = this.getCheckoutLinkFromSku(sku);
      const name = await this.getNameFromElement(element);
      const price = await this.getPriceFromElement(element);
      const link = await this.getLinkFromElement(element);

      const item: Item = {
        checkout_link,
        price,
        retailer: this.retailer,
        name,
        link,
      };

      if (item.price > this.max_price) {
        continue;
      }

      validItems.push(item);
      this.printItem(item);
    }

    if (validItems.length > 0) {
      await this.sendToDiscord(validItems);
      console.log(`Items found. Starting cooldown timer for ${this.cooldown_time}ms`);
      notifier.notify({
        title: 'New stock',
        message: `${this.retailer} ${this.item_name} stock. amount: ${validItems.length}`,
        sound: true,
        wait: true,
      });
      this.last_hit = new Date();
    }

    console.log(`\nFinished fetching item (${this.item_name}) from: `, this.chalkHeader(this.retailer));

    return validItems;
  }

  async addItemToEmbed(itemEmbed: MessageEmbed, item: Item) {
    itemEmbed.addField(`${item.name}`, `$${item.price}`)
      .addFields(
        { name: 'Add to cart', value: item.checkout_link, inline: true },
        { name: 'Item link', value: item.link, inline: true }
      );
  }

  async sendToDiscord(validItems: Array<Item>) {
    const itemEmbed = new MessageEmbed()
      .addField(`${this.retailer} Stock: ${validItems.length} items`, this.url);
    
    validItems.map(item => {
      this.addItemToEmbed(itemEmbed, item);
    });

    // await this.discord_channel.send('@everyone');
    await this.discord_channel.send(itemEmbed);
  }

  async printItem(item: Item) {
    console.log(chalk.bold.green("$" + item.price), " | ", chalk.blue(item.checkout_link))
  }
}