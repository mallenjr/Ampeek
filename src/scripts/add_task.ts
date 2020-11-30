import inquirer = require('inquirer');
import { Database } from '../lib/database';
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

interface StructuredRetailers {
  [key: string]: number
}

interface Task {
  name: string,
  max_price: number
  purchase_amount: number,
  url: string,
  task_amount: number,
  retailer: number | string,
}

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

async function getRetailers(db: Database): Promise<StructuredRetailers> {
  let sql = `
    SELECT *
    FROM retailer
    LIMIT 0, 49999;
  `;

  const dbRetailers: Array<any> = await db.all(sql);

  let structuredRetailers: StructuredRetailers = {};
  dbRetailers.map(row => {
    structuredRetailers[row['name']] = row['id'];
  });

  return structuredRetailers
}

async function getTaskParams(retailers: Array<string>) {
  return await askQuestion([
    {
      type: 'input',
      name: 'name',
      message: 'Enter the product name',
    }, {
      type: 'number',
      name: 'max_price',
      message: 'Enter max cost',
    }, {
      type: 'number',
      name: 'purchase_amount',
      message: 'How many to purchase?',
    }, {
      type: 'input',
      name: 'url',
      message: 'Enter the url'
    }, {
      type: 'number',
      name: 'task_amount',
      message: 'How many tasks to run (Recommended equal or less than commensorate retailer accounts)?',
    }, {
      type: 'list',
      name: 'retailer',
      message: 'Select retailer',
      choices: retailers
    }
  ]);
}

async function storeTask(db: Database, task: Task) {
  const sql = `
    INSERT INTO TASK (name, task_amount, purchase_amount, retailer_id, url, max_price)
      VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [task.name, task.task_amount, task.purchase_amount, task.retailer, task.url, task.max_price];

  await db.run(sql, params);
}

async function main() {
  const db = new Database('./ampeek.db');
  await db.setup();

  const retailers = await getRetailers(db);
  const task = await getTaskParams(Object.keys(retailers)) as Task;
  task.retailer = retailers[task.retailer];
  await storeTask(db, task);
}

try {
  main();
} catch (e) {
  console.log(e);
}