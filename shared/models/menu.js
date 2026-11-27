// Admin sidebar menu. Fields follow the Add Menu form; CRUD pages arrive on Day 03.
// type 'parent' = group heading (optional url); 'child' = page under parent_menu.
// is_hidden = "additional menu": grantable and accessible, but not shown in the sidebar.
import mongoose from 'mongoose';

const menu_schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: Number, enum: [0, 1], default: 1 },
    is_setting: { type: Boolean, default: false },
    is_hidden: { type: Boolean, default: false },
    type: { type: String, enum: ['parent', 'child'], required: true },
    parent_menu: { type: mongoose.Schema.Types.ObjectId, ref: 'menu', default: null },
    url: { type: String, trim: true, default: null, match: /^\/[a-z0-9_\-/]*$/ },
    icon: { type: String, trim: true, default: null, maxlength: 50 },
    sort_order: { type: Number, default: 0 },
  },
  { collection: 'menus', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

menu_schema.index({ status: 1, sort_order: 1 });

export const Menu = mongoose.model('menu', menu_schema);
