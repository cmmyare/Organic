// Admin request guards: CSRF for every state change, and session + menu access for every protected page.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Admin } from '../../shared/models/admin.js';
import { Menu } from '../../shared/models/menu.js';

const unsafe_methods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const always_allowed_paths = new Set(['/dashboard', '/logout']);

export function csrf_protect(req, res, next) {
  if (!req.session.csrf_token) req.session.csrf_token = randomBytes(32).toString('hex');
  res.locals.csrf_token = req.session.csrf_token;
  if (!unsafe_methods.has(req.method)) return next();

  const sent = Buffer.from(String(req.body?._csrf || req.get('x-csrf-token') || ''));
  const expected = Buffer.from(req.session.csrf_token);
  if (sent.length === expected.length && timingSafeEqual(sent, expected)) return next();

  req.log.warn({ event: 'csrf_rejected', path: req.path }, 'csrf token mismatch');
  return res.status(403).render('pages/error', { title: 'Forbidden', status: 403, message: 'Your form expired. Reload the page and try again.' });
}

// Loads the admin from the database on every request (never trusts session copies of grants),
// checks the requested path against the admin's menus, and builds the sidebar tree.
export async function require_admin(req, res, next) {
  const admin_id = req.session.admin_id;
  if (!admin_id) return send_to_login(req, res);

  const [admin, menus] = await Promise.all([
    Admin.findById(admin_id).select('name email_normalized type is_active auth_version url_array').lean(),
    Menu.find({ status: 1 }).select('title type parent_menu url icon is_hidden').sort({ sort_order: 1, title: 1 }).lean(),
  ]);

  if (!admin || !admin.is_active || admin.auth_version !== req.session.auth_version) {
    req.log.info({ event: 'admin_session_revoked', admin_id }, 'session no longer valid');
    return req.session.destroy(() => send_to_login(req, res));
  }

  // A child is usable only if its parent is active too (inactive parent hides its children).
  const active_ids = new Set(menus.map((menu) => String(menu._id)));
  const granted_ids = new Set(admin.url_array.map(String));
  const usable = menus.filter((menu) =>
    (!menu.parent_menu || active_ids.has(String(menu.parent_menu))) &&
    (admin.type === 0 || granted_ids.has(String(menu._id)) || menu.type === 'parent'),
  );

  const allowed = admin.type === 0 || always_allowed_paths.has(req.path) || usable.some((menu) =>
    menu.url && granted_ids.has(String(menu._id)) &&
    (req.path === menu.url || req.path.startsWith(`${menu.url}/`)),
  );
  if (!allowed) {
    req.log.warn({ event: 'admin_access_denied', admin_id, path: req.path }, 'menu not granted');
    return res.status(403).render('pages/error', { title: 'Forbidden', status: 403, message: 'You do not have access to this page.' });
  }

  // Sidebar: visible parents in order, each with its visible children. Parents without a link
  // and without visible children are dropped (a type 1 admin sees only what they were granted).
  const menu_tree = [];
  for (const parent of usable) {
    if (parent.type !== 'parent' || parent.is_hidden) continue;
    const children = usable.filter((menu) => menu.type === 'child' && !menu.is_hidden && String(menu.parent_menu) === String(parent._id));
    const parent_link = parent.url && (admin.type === 0 || granted_ids.has(String(parent._id)));
    if (children.length || parent_link) menu_tree.push({ ...parent, url: parent_link ? parent.url : null, children });
  }

  req.admin = admin;
  res.locals.admin = admin;
  res.locals.menu_tree = menu_tree;
  return next();
}

function send_to_login(req, res) {
  if (req.xhr) return res.status(401).json({ success: false, error: { code: 'SESSION_EXPIRED', message: 'Please sign in again' } });
  return res.redirect('/login');
}
