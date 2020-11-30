import * as parse from 'csv-parse';
const fs = require('fs').promises;

interface ProxyManager {
  [key: number]: {
    [key: number]: Date,
    proxy: any,
  };
}

const proxies: ProxyManager = {};

async function getProxyAddresses() {
  const content = await fs.readFile('./proxylist.csv');
  return new Promise((resolve, reject) => {
    parse(content, {
      columns: true,
    }, (err, res) => {
      if (err) {
        reject('Failed parsing proxy addresses');
      }
  
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

async function bootstrap() {
  const proxyAddresses = await getProxyAddresses();
  await processProxyAddresses(proxyAddresses);
}

bootstrap();