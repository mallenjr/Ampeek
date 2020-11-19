import inquirer = require('inquirer');
import { Retailers } from './retailers';
import { Database } from './database';
import { Subject } from 'rxjs';

interface RetailersResponse {
  retailers: Array<string>
}

async function getRetailers(): Promise<RetailersResponse> {
  const prompts = new Subject();
  return new Promise((resolve, reject) => {
    inquirer.prompt(prompts).then((values: RetailersResponse) => {
      resolve(values);
    }).catch(e => {
      reject(e)
    });
  
    prompts.next({
      type: 'checkbox',
      name: 'retailers',
      message: 'Select supported retailers',
      choices: Retailers
    });
  
    prompts.complete();
  })
}

async function getQueries(retailers: Array<string>) {
  const prompts = new Subject();
  return new Promise((resolve, reject) => {
    inquirer.prompt(prompts)
    .then(values => {
      resolve(values);
    })
    .catch(e => {
      reject(e);
    });

    retailers.forEach(value => {
      prompts.next({
        type: 'input',
        name: `${value}_query`,
        message: `Enter the query for ${value}`
      })
    })

    prompts.complete();
  });
}

async function getParams() {
  const retailers = await getRetailers();
  const queries = await getQueries(retailers.retailers);

  return new Promise((resolve, reject) => {
    inquirer.prompt([
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
    ]).then(values => {
      const params = Object.assign(values, {
        retailers: JSON.stringify(retailers),
        queries: JSON.stringify(queries),
      });
      resolve(params);
    }).catch(e => {
      reject(e);
    });
  })
}

async function storeProduct(params: any) {
  const db = new Database('./ampeek.db');
  await db.setup();

  const sql = `
    INSERT INTO product (name, retailers, count, queries, max_price)
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [params.name, params.retailers, params.count, params.queries, params.max_price]

  await db.run(sql, values);
  return;
}

async function main() {
  const params = await getParams();
  await storeProduct(params);
}

try {
  main();
} catch (e) {
  console.log(e);
}