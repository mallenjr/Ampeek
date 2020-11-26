import chalk = require("chalk");
import { TextChannel, MessageEmbed } from "discord.js";
import { Browser, ElementHandle } from "puppeteer";
import { Item, Scraper } from "../scraper"
const defaultUrl = 'https://www.amazon.com/stores/page/EE5B50AD-FBA9-40D8-9631-8E340D2B7B15'

export class AmazonScraper extends Scraper {
  private readonly session_id: string;

  constructor (discord_channel: TextChannel, browser: Browser, url: string = defaultUrl, item_name: string = 'RTX 2060', cooldown_time: number = 15000, max_price: number = 1000.00) {
    super(discord_channel, browser, url, cooldown_time, max_price, [ "load", "networkidle2" ]);
    this.selector = '//a[contains(text(), "Add to Cart")]|//button[contains(text(), "Add to Cart")]|//span[contains(text(), "Add to Cart")]';
    this.retailer = 'Amazon';
    this.chalkHeader = chalk.bold.yellow;
    this.item_name = item_name;
  }

  async getSkuFromElement(element: ElementHandle): Promise<string> {
    const link = await (await (await element.$('div > div > a')).getProperty('href')).jsonValue() as string;
    const sku = link.substring(link.indexOf('/dp/') + 4, link.indexOf('?ref_'));
    return sku;
  }

  async getLinkFromElement(element: ElementHandle): Promise<string> {
    const link = await (await (await element.$('div > div > a')).getProperty('href')).jsonValue() as string;
    return link;
  }

  async getPriceFromElement(element: ElementHandle): Promise<number> {
    const price_raw = await (await (await element.$('div > div > span.price')).getProperty('innerText')).jsonValue() as string;
    const dollars = price_raw.substring(1, price_raw.length - 2);
    const cents = price_raw.substring(price_raw.length - 2);
    const price = parseFloat(`${dollars}.${cents}`);
    return price;
  }

  async getNameFromElement(element: ElementHandle): Promise<string> {
    const name = await (await (await element.$('div > div > a')).getProperty('innerText')).jsonValue() as string;
    return name;
  }

  getCheckoutLinkFromSku(sku: string) {
    return `https://www.amazon.com/gp/add-to-cart/json/ref=ast_sto_atc?clientName=amazon-stores-rendering&verificationSessionID=${this.session_id}&ASIN=${sku}`;
  }

  async addItemToEmbed(itemEmbed: MessageEmbed, item: Item) {
    itemEmbed.addField(`${item.name}`, `$${item.price}`)
      .addFields(
        { name: 'Add to cart', value: item.checkout_link, inline: true },
        { name: 'Checkout', value: 'https://www.amazon.com/gp/cart/view.html?ref_=nav_cart', inline: true}
      );
  }

  async printItem(item: Item) {
    console.log(chalk.bold.green("$" + item.price), " | ", chalk.blue(item.checkout_link));
    console.log(chalk.bold('CART LINK '), '|', chalk.blue('https://www.amazon.com/gp/cart/view.html?ref_=nav_cart\n'))
  }
}