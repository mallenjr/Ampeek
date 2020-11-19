import * as Queue from 'bee-queue';

const purchaseQueue = new Queue('purchase', {
  redis: {
    port: 6382
  }
});

purchaseQueue.process(async (job) => {
  console.log('Processing a purchase job');
  return true;
});