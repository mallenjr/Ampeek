import { sleep } from "../utils";
import * as puppeteer from 'puppeteer';
import { Tasks } from "../retailers";
import { Task } from "../classes/task";

const puppeteerEndpoint = process.argv[2];

process.on('message', async (task) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: puppeteerEndpoint
  });

  const retailer = task.retailer;
  const taskClass = Tasks[retailer];
  const taskInstance = new taskClass(browser, task.url, task.name, retailer) as Task;
  await taskInstance.setup();

  while (true) {
    if (await taskInstance.execute()) {
      await taskInstance.close();
      process.send(true);
      process.exit(2020); // I can see clearly
    }

    await sleep(1000);
  }
});