import { BestBuyScraper } from './bestBuy';
import { AmazonScraper } from './amazon';
import { NeweggScraper } from './newegg';
import { WalmartScraper } from './walmart';

export {
  BestBuyScraper,
  AmazonScraper,
  NeweggScraper,
  WalmartScraper,
}

export const Scrapers = {
  'bestbuy': BestBuyScraper,
  'amazon': AmazonScraper,
  'newegg': NeweggScraper,
  'walmart': WalmartScraper,
}

export const Retailers = [
  'bestbuy',
  'amazon',
  'newegg',
  'walmart'
]