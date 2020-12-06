import { Page, devices, LoadEvent, Browser, BrowserContext } from "puppeteer";
import { Request } from "zeromq";
const useProxy = require('puppeteer-page-proxy');

export class Task {
  private readonly userAgent = devices['iPad landscape'];
  private readonly broswer: Browser;
  private privateContext: BrowserContext;
  protected page: Page;
  private readonly load_conditions: LoadEvent[];
  private requestCount: number;

  private proxyAddress: string;
  protected blockedHosts: Array<string>;

  protected retailer: string;
  protected name: string;
  protected item_url: string;
  protected readonly max_purchase_amount: number;

  private readonly session_manager: Request;
  private readonly proxy_manager: Request;

  constructor(browser: Browser, url: string, name: string, retailer: string, max_purchase_amount: number = 1, load_conditions: LoadEvent[] = ["load"]) {
    this.broswer = browser;
    this.item_url = url;
    this.max_purchase_amount = max_purchase_amount;
    this.load_conditions = load_conditions;
    this.name = name;
    this.retailer = retailer;
    this.session_manager = new Request();
    this.session_manager.connect('tcp://127.0.0.1:8689');
    this.proxy_manager = new Request();
    this.proxy_manager.connect('tcp://127.0.0.1:8690');
    this.requestCount = 0;
  }

  async setup() {
    this.privateContext = await this.broswer.createIncognitoBrowserContext();
    this.page = await this.privateContext.newPage();
    await this.page.emulate(this.userAgent);
    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'deny'
    });
    await this.page.setRequestInterception(true);
  }

  async close() {
    await this.page.close();
  }

  async checkItemInStock(): Promise<boolean> {
    return false;
  }

  async clearCookies() {
    const client = await this.page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  }

  async setCookies(cookies: any) {
    await this.clearCookies();
    await this.page.setCookie(...cookies || '[]');
  }

  async buy(): Promise<void> {}

  async requestSession(): Promise<void> {
    await this.session_manager.send(['request', this.retailer]);
    const [result] = await this.session_manager.receive();
    console.log(result);
    return;
  }

  async requestProxy(): Promise<boolean> {
    await this.proxy_manager.send(['request', this.retailer]);
    const [_proxy] = await this.proxy_manager.receive();
    let proxyString = _proxy.toString();
    if (proxyString === 'error') {
      return false;
    }

    const { proxy } = JSON.parse(proxyString);
    this.proxyAddress = `http://${proxy.login}:${proxy.password}@${proxy.ip}:${proxy.port_http}`;
    return true;
  }

  async checkRequestCount(): Promise<boolean> {
    try {
      if (this.requestCount >= 5) {
        await this.privateContext.close();
        await this.setup();
      }
  
      this.requestCount = (this.requestCount + 1) % 6;
      return true;
    } catch (e) {
      return false;
    }
  }

  async captcha(): Promise<boolean> {
    return false;
  }

  async reloadPage(): Promise<boolean> {
    await this.clearCookies();
    this.page.removeAllListeners('request');
    this.page.on("request", async (req) => {
      const urlHost = new URL(req.url()).host;
      if (this.blockedHosts && this.blockedHosts.includes(urlHost)) {
        await req.abort();
      } else {
        switch (await req.resourceType()) {
          case "image":
          case "stylesheet":
          case "font":
            await req.abort();
            break;
          default:
            await useProxy(req, this.proxyAddress);
            // await req.continue();
            break;
        }
      }
    });

    try {
      await this.page.goto(this.item_url, { waitUntil: this.load_conditions });
      if (await this.captcha()) {
        console.log('Walmart captcha alert!');
        return false;
      }
    } catch (e) {
      console.log(e);
      console.log(`Error: Failed reloading ${this.name} page on ${this.retailer}`);
      return false;
    }
    return true;
  }
}