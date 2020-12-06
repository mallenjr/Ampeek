import * as parse from 'csv-parse';
import { Reply } from 'zeromq';
const fs = require('fs').promises;

interface ProxyList {
  [key: number]: {
    [key: number]: Date,
    proxy: any,
  };
}

const proxies: ProxyList = {};

interface ProxyCursor {
  [key: string]: number;
}

const proxyCursor: ProxyCursor = {};

interface ProxyTimerStore {
  [key: string]: Date
}

const proxyTimerStore: ProxyTimerStore = {};

async function getProxyAddresses() {
  const content = await fs.readFile('./proxylist.csv');
  return new Promise((resolve, reject) => {
    parse(content, {
      columns: true,
    }, (err, res) => {
      if (err)
        reject('Failed parsing proxy addresses')
  
      resolve(res);
    });
  });
}

async function processProxyAddresses(addresses: any) {
  addresses.map((address, index) => {
    proxies[index] = {
      proxy: address,
    }
  });
}

function incrementProxyCursor(retailer:string) {
  if (!proxyCursor[retailer]) {
    proxyCursor[retailer] = 0;
  }

  proxyCursor[retailer] = (proxyCursor[retailer] + 1) % Object.keys(proxies).length;
}

async function getProxyAddressForRetailer(retailer: string): Promise<string> {
  if (!proxyCursor[retailer]) {
    proxyCursor[retailer] = 0;
  }

  const index = proxyCursor[retailer];
  const timerKey = `${retailer}-${index}`;
  const now = new Date();

  if (proxyTimerStore[timerKey] && now.getTime() - proxyTimerStore[timerKey].getTime() < 4000) {
    incrementProxyCursor(retailer);
    return 'error';
  }

  proxyTimerStore[timerKey] = now;
  const returnProxy = proxies[index];
  incrementProxyCursor(retailer);
  
  return JSON.stringify(returnProxy);
}

async function bootstrap() {
  const proxyAddresses = await getProxyAddresses();
  await processProxyAddresses(proxyAddresses);

  const sock = new Reply();
  await sock.bind('tcp://*:8690');

  for await (const [_topic, _msg] of sock) {
    const topic = _topic.toString();
    const msg = _msg.toString();
    switch (topic) {
      case 'request':
        const proxy = await getProxyAddressForRetailer(msg);
        await sock.send(proxy);
        break;
      default:
        await sock.send('error');
        continue;
    }
  }
}

bootstrap();