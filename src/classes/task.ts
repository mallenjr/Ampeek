import { Page, devices, LoadEvent, Browser, BrowserContext } from "puppeteer";
import { Request } from "zeromq";

export class Task {
  private readonly userAgent = devices['iPad landscape'];
  private readonly broswer: Browser;
  private privateContext: BrowserContext;
  protected page: Page;
  private readonly load_conditions: LoadEvent[];

  protected retailer: string;
  protected name: string;
  protected item_url: string;
  protected readonly max_purchase_amount: number;

  private readonly session_manager: Request;

  constructor(browser: Browser, url: string, name: string, retailer: string, max_purchase_amount: number = 1, load_conditions: LoadEvent[] = ["load"]) {
    this.broswer = browser;
    this.item_url = url;
    this.max_purchase_amount = max_purchase_amount;
    this.load_conditions = load_conditions;
    this.name = name;
    this.retailer = retailer;
    this.session_manager = new Request();
    this.session_manager.connect('tcp://127.0.0.1:8689');
  }

  async setup() {
    this.privateContext = await this.broswer.createIncognitoBrowserContext();
    this.page = await this.privateContext.newPage();
    await this.page.emulate(this.userAgent);
    await this.page.setRequestInterception(true);
    this.page.on('request', async request => {
      if (request.resourceType() === 'image' || request.resourceType() === 'xhr' || request.resourceType() === 'media') {
        request.abort();
      } else {
        request.continue();
          // await useProxy(request, 'socks4://127.0.0.1:1080');
      }
    });

    await this.page.goto(this.item_url);
  }

  async close() {
    await this.page.close();
  }

  async checkItemInStock(): Promise<boolean> {
    return false;
  }

  async setCookies(cookies: any) {
    const client = await this.page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await this.page.setCookie(...cookies || '[]');
  }

  async buy(): Promise<void> {}

  async requestSession(): Promise<void> {
    await this.session_manager.send(['request', this.retailer]);
    const [result] = await this.session_manager.receive();
    console.log(result);
    return;
  }

  async execute(): Promise<boolean> {
    try {
      await this.page.reload({ waitUntil: this.load_conditions });
    } catch (e) {
      console.log(e);
      console.log(`Error: Failed reloading ${this.name} page on ${this.retailer}`);
      return false;
    }

    if (!(await this.checkItemInStock())) {
      return false;
    }

    try {
      await this.requestSession();
      // await this.buy();
      return true;
    } catch (e) {
      console.log(e);
      console.log(`Error: Failed purchasing ${this.name} on ${this.retailer}`);
      return false;
    }
  }
}