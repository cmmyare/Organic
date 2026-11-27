/* ORIGIN admin client script (jQuery). */
// Every AJAX request sends the CSRF token; an expired session sends the user to the login page.
$.ajaxSetup({ headers: { 'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content') } });
$(document).ajaxError(function (event, xhr) {
  if (xhr.status === 401) window.location.href = '/login';
});

$(function () {
  var $health_list = $('#health_list');
  if (!$health_list.length) return;

  function render_health(body) {
    var checks = (body && body.data && body.data.checks) || {};
    var names = Object.keys(checks);
    $health_list.empty();
    if (!names.length) {
      $health_list.append($('<li>').text('No checks reported.'));
      return;
    }
    names.forEach(function (name) {
      var check = checks[name];
      var ok = check.ok;
      var label = ok ? '✓ OK' : '✗ Not ready';
      if (check.detail) label += ' (' + check.detail + ')';
      $health_list.append(
        $('<li>')
          .addClass(ok ? 'origin-status-ok' : 'origin-status-bad')
          .append($('<strong>').text(name + ': '))
          .append(document.createTextNode(label))
      );
    });
  }

  $.ajax({ url: '/health/ready', dataType: 'json' })
    .done(render_health)
    .fail(function (xhr) { render_health(xhr.responseJSON); });
});
