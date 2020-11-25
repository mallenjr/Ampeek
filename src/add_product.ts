import inquirer = require('inquirer');
import { Database } from './database';
// import { Subject } from 'rxjs';

// interface RetailersResponse {
//   retailers: Array<string>
// }

// async function getRetailers(retailers: Array<any>): Promise<RetailersResponse> {
//   const prompts = new Subject();
//   return new Promise((resolve, reject) => {
//     inquirer.prompt(prompts).then((values: RetailersResponse) => {
//       resolve(values);
//     }).catch(e => {
//       reject(e)
//     });
  
//     prompts.next({
//       type: 'checkbox',
//       name: 'retailers',
//       message: 'Select supported retailers',
//       choices: retailers
//     });
  
//     prompts.complete();
//   })
// }

async function askQuestion(questions: Array<any>) {
  return new Promise((resolve, reject) => {
    inquirer.prompt(questions)
    .then(values => {
      resolve(values);
    }).catch(err => {
      reject(err);
    });
  })
}

async function getLinks(retailers: Array<any>, totalLinks = 0): Promise<Array<any>> {
  if (totalLinks > 0) {
    const anotherLink: any = await askQuestion([
      {
        type: 'confirm',
        name: 'add_link',
        message: 'Would you like to add another link?'
      }
    ]);

    if (!anotherLink.add_link) {
      return [];
    }
  }

  const linkDetails: any = await askQuestion([
    {
      type: 'input',
      name: 'link',
      message: 'Enter link',
    }, {
      type: 'list',
      name: 'retailer',
      message: 'Select retailer',
      choices: retailers
    }
  ]);

  totalLinks++;
  return [...(await getLinks(retailers, totalLinks)), linkDetails];
}

async function getProductInfo() {
  return await askQuestion([
    {
      type: 'input',
      name: 'name',
      message: 'Enter the product name',
    }, {
      type: 'number',
      name: 'count',
      message: 'How many to purchase?',
    }, {
      type: 'number',
      name: 'max_price',
      message: 'Enter maximum price',
    }
  ]);
}

async function createProduct(db: Database) {
  let sql = `
    SELECT *
    FROM retailer
    LIMIT 0, 49999;
  `;

  const dbRetailers: Array<any> = await db.all(sql);

  let structuredRetailers = {};
  dbRetailers.map(row => {
    structuredRetailers[row['name']] = row['id'];
  });

  const productInfo: any = await getProductInfo();
  const links = await getLinks(Object.keys(structuredRetailers));
  
  sql = `
    INSERT INTO product (name, amount_wanted, max_price)
    VALUES (?, ?, ?);
  `;

  let params = [productInfo.name, productInfo.count, productInfo.max_price]

  const productID: number = await db.run(sql, params);

  for(const link_id in links) {
    const link = links[link_id];
    sql = `
      INSERT INTO link (product_id, retailer_id, url)
        VALUES (?, ?, ?)
    `;

    params = [productID, structuredRetailers[link['retailer']], link.link]
    await db.run(sql, params);
  }

}

async function main() {
  const db = new Database('./ampeek.db');
  await db.setup();

  await createProduct(db);
}

try {
  main();
} catch (e) {
  console.log(e);
}