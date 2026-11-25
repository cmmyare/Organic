// /api/v1 router. Customer and provider route groups are mounted here;
// their endpoints are implemented from Day 17 onward.
import express from 'express';
import { create_customer_router } from './customer/index.js';
import { create_provider_router } from './provider/index.js';

export function create_v1_router() {
  const router = express.Router();
  router.use('/customer', create_customer_router());
  router.use('/provider', create_provider_router());
  return router;
}
