import { Browser, Page, devices } from "puppeteer";

export abstract class Purchaser {
  private readonly userAgent = devices['iPad landscape'];
  private readonly broswer: Browser;

  protected readonly item_url: string;
  protected retailer: string;

  private page: Page;

  constructor(browser: Browser, url: string) {
    this.broswer = browser;
  }

  async setup() {
    this.page = await this.broswer.newPage();
    await this.page.emulate(this.userAgent);
    await this.page.goto(this.item_url);
  }

  async login(): Promise<void> {

  }
}