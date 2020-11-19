import * as Queue from 'bee-queue';
import { Database } from './database';
// import { Scrapers } from './retailers';

const purchaseQueue = new Queue('purchase', {
  redis: {
    port: 6382
  }
});

const db = new Database('./ampeek.db');

async function bootstrap() {
  await db.setup();

  console.log(purchaseQueue);
};

bootstrap();