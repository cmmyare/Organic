// Admin page routes. Day 01 only has the foundation page; login, sessions
// and permission guards arrive on Day 02-03 and will wrap these routes.
import express from 'express';

export function create_page_router() {
  const router = express.Router();

  router.get('/', (req, res) => res.redirect('/dashboard'));

  router.get('/dashboard', (req, res) => {
    res.render('pages/dashboard', { title: 'Dashboard' });
  });

  return router;
}
