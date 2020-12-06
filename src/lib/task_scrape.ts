import * as puppeteer from 'puppeteer';
import { Tasks, Purchasers } from "../retailers";
import { Task } from "../classes/task";
import { Purchaser } from '../classes/purchaser';
import { sleep } from '../utils/utils';
import Database from './database';

const puppeteerEndpoint = process.argv[2];

interface TaskRecord {
  retailer: string;
  url: string;
  name: string;
  id: number;
  purchase_amount: number;
  task_amount: number;
  activated: boolean;
}

let purchasers = {};

process.on('message', async (_task) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: puppeteerEndpoint
  });

  const db = new Database('./ampeek.db');
  await db.setup();

  let sql = `
    SELECT t.*, r.name as retailer
    FROM task AS t
    LEFT JOIN retailer AS r
      ON t.retailer_id = r.id
    WHERE t.id = ${_task.id}
    `;

  const task = await db.get(sql) as TaskRecord;

  const retailer = task.retailer;
  const taskClass = Tasks[retailer];
  const taskInstance = new taskClass(browser, task.url, task.name, retailer) as Task;
  await taskInstance.setup();

  const taskId = `Item: ${task.name} | Retailer: ${retailer} :`;

  while (true) {
    if (!(await taskInstance.checkRequestCount())) {
      console.log(`${taskId} Failed to check request count.`);
      continue;
    }

    if (!(await taskInstance.requestProxy())) {
      console.log(`${taskId} Failed to acquire new proxy.`);
      sleep(1000);
      continue;
    }

    if (!(await taskInstance.reloadPage())) {
      console.log(`${taskId} Failed to reload page.`);
      continue;
    }

    if (!(await taskInstance.checkItemInStock())) {
      console.log(`${taskId} Item not in stock`);
      continue;
    }

    console.log(`${taskId} Item in stock. Attempting to purchase.`);

    while(task.purchase_amount > 0) {
      const purchasePromiseArray = [...Array(task.task_amount).keys()].map(key => {
        return (async () => {
          const purchaserClass = Purchasers[task.retailer];
          const purchaserInstance = new purchaserClass(browser, task.url) as Purchaser;
          purchasers[`${task.retailer}-${key}`] = purchaserInstance;
          if (!(await purchaserInstance.setup())) {
            console.log('failed to setup');
            await purchaserInstance.close();
            delete purchasers[`${task.retailer}-${key}`];
            return false;
          }
  
          if (!(await purchaserInstance.requestSession())) {
            console.log('failed to get session');
            await purchaserInstance.close();
            delete purchasers[`${task.retailer}-${key}`];
            return false;
          }

          if (!(await purchaserInstance.gotoPage())) {
            console.log('failed to goto page');
            await purchaserInstance.releaseSession();
            await purchaserInstance.close();
            delete purchasers[`${task.retailer}-${key}`];
            return false;
          }
  
          try {
            if (!(await purchaserInstance.buy())) {
              console.log('failed to buy');
              await purchaserInstance.releaseSession();
              await purchaserInstance.close();
              delete purchasers[`${task.retailer}-${key}`];
              return false;
            }
          } catch(e) {
            await purchaserInstance.releaseSession();
            await purchaserInstance.close();
            delete purchasers[`${task.retailer}-${key}`]
            return false;
          }
  
          if (!(await purchaserInstance.releaseSession())) {
            console.log('failed to get session');
            await purchaserInstance.close();
            delete purchasers[`${task.retailer}-${key}`]
            return false;
          }
  
          await purchaserInstance.close();
          delete purchasers[`${task.retailer}-${key}`]
          return true;
        })();
      });

      const results = await Promise.all(purchasePromiseArray);
      console.log(results);
    }
  }
});

process.on('SIGINT', async () => {
  console.log('Shutdown signal received. Closing dangling purchasers');
  for (const index in purchasers) {
    const purchaser = purchasers[index] as Purchaser;
    await purchaser.releaseSession();
    await purchaser.close();
  }
})