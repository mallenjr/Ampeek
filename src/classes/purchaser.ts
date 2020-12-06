import { Page, devices, BrowserContext, Browser } from "puppeteer";
import { Request } from "zeromq";
const useProxy = require('puppeteer-page-proxy');

interface Session {
  session: string;
  id: number;
}

export abstract class Purchaser {
  private readonly userAgent = devices['iPad landscape'];
  protected broswer: Browser;
  private privateContext: BrowserContext;

  protected item_url: string;
  protected retailer: string;
  protected session: Session;

  protected page: Page;

  private readonly session_manager: Request;
  private readonly proxy_manager: Request;

  private proxyAddress: string;

  constructor(browser: Browser, url: string) {
    this.broswer = browser;
    this.item_url = url;

    this.session_manager = new Request();
    this.session_manager.connect('tcp://127.0.0.1:8689');
    this.proxy_manager = new Request();
    this.proxy_manager.connect('tcp://127.0.0.1:8690');
  }

  async requestProxy(): Promise<boolean> {
    await this.proxy_manager.send(['request', this.retailer]);
    const [_proxy] = await this.proxy_manager.receive();
    let proxyString = _proxy.toString();
    if (proxyString === 'error') {
      return false;
    }

    const { proxy } = JSON.parse(proxyString);
    this.proxyAddress = `socks5://${proxy.login}:${proxy.password}@${proxy.ip}:${proxy.port_socks}`;
    return true;
  }

  async setProxy(): Promise<boolean> {
    if (!await this.requestProxy()) {
      return false;
    }
    console.log(this.proxyAddress);
    await this.page.setRequestInterception(true);
    this.page.removeAllListeners('request');
    this.page.on("request", async (req) => {
      if (req.resourceType() === 'image') {
        req.abort();
      } else {
        await useProxy(req, this.proxyAddress);
      }
    });
    console.log('proxy set');
    return true;
  }

  async setup(): Promise<boolean> {
    this.privateContext = await this.broswer.createIncognitoBrowserContext();
    this.page = await this.privateContext.newPage();
    await this.page.emulate(this.userAgent);
    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'deny'
    });
    if (!await this.requestProxy()) {
      return false;
    }

    return true;
  }

  async requestSession(): Promise<boolean> {
    await this.session_manager.send(['request', this.retailer]);
    const [_session] = await this.session_manager.receive();
    let session = _session.toString();
    if (session === 'error') {
      return false;
    }

    this.session = JSON.parse(session);
    await this.setCookies(JSON.parse(this.session.session));
    return true;
  }

  async releaseSession(): Promise<boolean> {
    await this.session_manager.send(['release', `${this.session.id}`]);
    const [_response] = await this.session_manager.receive();
    const response = _response.toString();
    return response === 'error';
  }

  async gotoPage(): Promise<boolean> {
    try {
      if (!await this.setProxy()) {
        return false;
      }
      await this.page.goto(this.item_url, { waitUntil: ['networkidle2'] });
      return true;
    } catch (e) {
      return false;
    }
  }

  async close() {
    await this.privateContext.close();
    return;
  }

  async setCookies(cookies: any) {
    try {
      const client = await this.page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
    } catch (e) {
      //
    }
    await this.page.setCookie(...cookies || '[]');
    return;
  }

  async buy(): Promise<boolean> {
    return false;
  };
}