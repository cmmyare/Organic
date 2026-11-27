// All admin routes. /login is public; every route after require_admin needs a valid session
// and a granted menu for the requested URL (type 0 admins pass for every active menu).
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { require_admin } from '../middleware/auth.js';
import { get_login, post_login, post_logout, get_dashboard } from '../controllers/admin_controller.js';

const router = express.Router();

// 10 failed sign-ins per IP per 15 minutes; successful logins are not counted.
const login_limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/login', get_login);
router.post('/login', login_limiter, post_login);

router.use(require_admin);

router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/dashboard', get_dashboard);
router.post('/logout', post_logout);

export default router;
