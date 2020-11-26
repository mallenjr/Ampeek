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

async function getAccountInfo(retailers: Array<any>) {
  return await askQuestion([
    {
      type: 'input',
      name: 'email',
      message: 'Enter email',
    }, {
      type: 'password',
      name: 'password',
      message: 'Enter password',
    }, {
      type: 'list',
      name: 'retailer',
      message: 'Select retailer',
      choices: retailers
    }
  ]);
}

async function createAccount(db: Database) {
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

  const productInfo: any = await getAccountInfo(Object.keys(structuredRetailers));

  sql = `
    INSERT INTO account (email, password, retailer_id)
    VALUES (?, ?, ?)
  `;
  const params = [productInfo.email, productInfo.password, structuredRetailers[productInfo.retailer]]

  await db.run(sql, params);
}

async function main() {
  const db = new Database('./ampeek.db');
  await db.setup();

  await createAccount(db);
}

try {
  main();
} catch (e) {
  console.log(e);
}