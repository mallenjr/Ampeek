import { Browser, ElementHandle } from 'puppeteer';
import { Item, Scraper } from '../scraper';
import chalk = require("chalk");
import { MessageEmbed, TextChannel } from 'discord.js';

export class WalmartScraper extends Scraper {
  constructor(discord_channel: TextChannel, browser: Browser, item_query_param: string, item_name: string, cooldown_time: number = 15000, max_price: number = 1000.00) {
    const url = `https://www.walmart.com/search/?query=${item_query_param}`;
    super(discord_channel, browser, url, cooldown_time, max_price, ['networkidle2']);
    this.selector = '//button[contains(text(), "Add to cart")]/ancestor::div[contains(concat(" ", normalize-space(@class), " "), " arrange-fill ")]\
                    |//span[contains(text(), "Choose Options")]/ancestor::div[contains(concat(" ", normalize-space(@class), " "), " arrange-fill ")]';
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