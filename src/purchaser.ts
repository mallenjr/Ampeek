import { Page, devices, BrowserContext, Cookie } from "puppeteer";

export abstract class Purchaser {
  private readonly userAgent = devices['iPad landscape'];
  protected broswer: BrowserContext;

  protected item_url: string;
  protected retailer: string;

  protected page: Page;

  constructor(browser: BrowserContext, url: string) {
    this.broswer = browser;
    this.item_url = url;
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
    await this.page.goto(this.item_url);
  }

  async login(email: string, password: string): Promise<Cookie[] | null> {
    return null;
  }

  async close() {
    await this.page.close();
    return;
  }

  async setCookies(cookies: any) {
    const client = await this.page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await this.page.setCookie(...cookies || '[]');
  }

  async buy() {
    console.log('here');
  };
}