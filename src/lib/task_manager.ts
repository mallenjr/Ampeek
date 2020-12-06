import { Database } from "./database";

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

import cp = require('child_process');
import { Browser } from "puppeteer";
// import { sleep } from "../utils";

interface TaskTracker {
  [key: number]: cp.ChildProcess,
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

    if (tasksTracker[task.id]) {
      continue;
    }

    tasksTracker[task.id] = cp.fork('./dist/lib/task_scrape.js', [browser.wsEndpoint()]);

    tasksTracker[task.id].on('message', (m) => {
      console.log(m);
    });

    tasksTracker[task.id].send(task);

    tasksTracker[task.id].on('close', (m) => {
      delete tasksTracker[task.id];
      console.log(m);
    });
  }
}

async function bootstrap() {
  const db = new Database('./ampeek.db');
  await db.setup();

  const browser = await puppeteer.launch({ headless: false });

  const tasks = await getTasks(db);
  await executeTasks(tasks, browser);
}

bootstrap();