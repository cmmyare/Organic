# Layouts

The admin uses plain EJS includes instead of a layout library. Every page:

```ejs
<%- include('../partials/head') %>
<%- include('../partials/topbar') %>
<div class="origin-shell">
  <%- include('../partials/sidebar') %>
  <main class="origin-main"> ...page content... </main>
</div>
<%- include('../partials/foot') %>
```

Add shared layout fragments here if a page needs a different shell (for example the login page).
