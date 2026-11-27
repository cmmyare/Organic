// Admin user. type 0 = general admin (all active menus); type 1 = only menus in url_array.
// Roles, overrides and permission keys are added on Day 03 (RBAC).
import mongoose from 'mongoose';

const admin_schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email_normalized: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password_hash: { type: String, required: true, select: false },
    type: { type: Number, enum: [0, 1], required: true, default: 1 },
    url_array: [{ type: mongoose.Schema.Types.ObjectId, ref: 'menu' }],
    is_active: { type: Boolean, default: true },
    auth_version: { type: Number, default: 1 }, // bump to revoke all sessions of this admin
    last_login_at: { type: Date, default: null },
  },
  { collection: 'admins', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const Admin = mongoose.model('admin', admin_schema);
