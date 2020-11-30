import { Database } from "./database";

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

import cp = require('child_process');
import { Browser } from "puppeteer";

interface TaskTracker {
  [key: number]: {
    [key: number]: cp.ChildProcess
  }
}

const tasksTracker: TaskTracker = {};

async function getTasks(db:Database) {
  const sql = `
    SELECT t.*, r.name as retailer
    FROM task AS t
    LEFT JOIN retailer AS r
      ON t.retailer_id = r.id
    WHERE t.activated = 1
      AND t.running = 0
      AND t.purchase_amount > 0
    LIMIT 0, 49999;
  `;

  let tasks: any;

  try {
    tasks = await db.all(sql);
  } catch (e) {
    console.log(e);
    console.log('Failed fetching tasks from the database.');
    return [];
  }

  return tasks;
}

async function executeTasks(tasks:any, browser: Browser) {
  for (const index in tasks) {
    const task = tasks[index];
    let taskRef = tasksTracker[task.id];

    if (!taskRef) {
      tasksTracker[task.id] = {};
      taskRef = tasksTracker[task.id];
    }

    if (Object.keys(taskRef).length >= task.task_amount) {
      continue;
    }

    const adjustedTaskCount = Math.min(task.task_amount, task.purchase_amount) - Object.keys(taskRef).length;

    for(const count in Array.from(Array(Math.max(0, adjustedTaskCount)).keys())) {

      const key = Date.now() + count;

      taskRef[key] = cp.fork('./dist/lib/task_execute.js', [browser.wsEndpoint()]);

      taskRef[key].on('message', (m) => {
        console.log(m);
      });

      taskRef[key].send(task);

      taskRef[key].on('close', (m) => {
        delete taskRef[key];
        console.log(m);
      });
    }
  }
}

async function bootstrap() {
  const db = new Database('./ampeek.db');
  await db.setup();

  const browser = await puppeteer.launch({ headless: false });

  const tasks = await getTasks(db);
  while (true) {
    await executeTasks(tasks, browser);
  }
}

bootstrap();