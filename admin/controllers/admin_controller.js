// Admin page controllers: each page has a GET (render) and, where it changes state, a POST.
import bcrypt from 'bcryptjs';
import { Admin } from '../../shared/models/admin.js';


const dummy_hash = '$2b$12$td0Ug2rGWbaivtBPvws1WeFQ28bwg1f/k.VEGwdNqd9OtNA4MdzRO';
const invalid_message = 'Invalid email or password.';

export function get_login(req, res) {
  if (req.session.admin_id) return res.redirect('/dashboard');
  return res.render('pages/login', { title: 'Sign in', email: '', error: null });
}

export async function post_login(req, res, next) {
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
  const password = String(req.body.password || '').slice(0, 200);

  if (!email || !password) {
    return res.status(400).render('pages/login', { title: 'Sign in', email, error: 'Enter your email and password.' });
  }

  const admin = await Admin.findOne({ email_normalized: email }).select('+password_hash type is_active auth_version').lean();
  const password_ok = await bcrypt.compare(password, admin?.password_hash || dummy_hash);

  if (!admin || !password_ok || !admin.is_active) {
    req.log.warn({ event: 'admin_login_failed', email }, 'admin login failed');
    return res.status(401).render('pages/login', { title: 'Sign in', email, error: invalid_message });
  }

  // New session ID on login (prevents session fixation); then store only identifiers.
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.admin_id = String(admin._id);
    req.session.auth_version = admin.auth_version;
    req.session.save(async (save_error) => {
      if (save_error) return next(save_error);
      await Admin.updateOne({ _id: admin._id }, { $set: { last_login_at: new Date() } });
      req.log.info({ event: 'admin_login_success', admin_id: String(admin._id) }, 'admin logged in');
      return res.redirect('/dashboard');
    });
  });
}

export function post_logout(req, res, next) {
  const admin_id = req.session.admin_id;
  req.session.destroy((error) => {
    if (error) return next(error);
    req.log.info({ event: 'admin_logout', admin_id }, 'admin logged out');
    res.clearCookie(req.app.get('session_cookie_name'));
    return res.redirect('/login');
  });
}

export function get_dashboard(req, res) {
  return res.render('pages/dashboard', { title: 'Dashboard' });
}
