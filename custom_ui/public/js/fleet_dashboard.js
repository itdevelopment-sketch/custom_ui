/* ============================================================
   UBS Fleet Dashboard JS  v2
   frappe.call → ubs_theme.www.fleet_dashboard.get_dashboard_data
   ============================================================ */
frappe.ready(function () {

  /* Mark body → CSS hides Frappe chrome */
  document.body.classList.add("ubs-fleet-page");

  /* User info */
  const full     = frappe.session.user_fullname || frappe.session.user || "Admin";
  const initials = full.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  _q("#sb-av")    && (_q("#sb-av").textContent    = initials);
  _q("#sb-uname") && (_q("#sb-uname").textContent = full);

  /* Sync time */
  _q("#tb-sync") && (_q("#tb-sync").textContent =
    "Updated " + frappe.datetime.now_datetime());

  /* Static trend chart renders immediately (no API needed) */
  _renderTrendChart();

  /* Live data */
  frappe.call({
    method: "ubs_theme.www.fleet_dashboard.get_dashboard_data",
    freeze: false,
    callback: function (r) {
      if (!r.message) { frappe.msgprint("Dashboard data unavailable."); return; }
      const d = r.message;
      _vehicleStatus(d.vehicle_status);
      _serviceReminders(d.service_reminders);
      _workOrders(d.work_orders);
      _ttr(d.time_to_resolve);
      _compliance(d.compliance);
      _inspections(d.inspections);
      _fuelCosts(d.fuel_costs);
      _assignments(d.assignments);
      _assessments(d.assessments);

      /* sidebar badges */
      const vs = d.vehicle_status;
      _q("#sb-fleet-count") && vs &&
        (_q("#sb-fleet-count").textContent = vs.active || "—");
      _q("#sb-wo-count") && d.work_orders &&
        (_q("#sb-wo-count").textContent = d.work_orders.overdue || "—");
    }
  });
});

/* ── Tiny helpers ─────────────────────────────────────────── */
function _q(sel)      { return document.querySelector(sel); }
function _id(id)      { return document.getElementById(id); }
function _fmt(n)      { return Number(n || 0).toLocaleString("en-IN"); }
function _pct(a, b)   { return b ? Math.round(a / b * 100) : 0; }
function _set(id, v)  { const el = _id(id); if (el) el.textContent = v; }

/* ── Vehicle Status ─────────────────────────────────────── */
function _vehicleStatus(vs) {
  if (!vs) return;
  const total = vs.total || 1;
  const rows = [
    ["vs-active",   "bar-active",   vs.active,          _pct(vs.active, total)],
    ["vs-inactive", "bar-inactive", vs.inactive,         _pct(vs.inactive, total)],
    ["vs-shop",     "bar-shop",     vs.in_shop,          _pct(vs.in_shop, total)],
    ["vs-oos",      "bar-oos",      vs.out_of_service,   _pct(vs.out_of_service, total)],
  ];
  rows.forEach(([cId, bId, val, pct]) => {
    _set(cId, _fmt(val));
    const bar = _id(bId);
    if (bar) bar.style.width = Math.max(pct, 3) + "%";
  });
}

/* ── Service Reminders ──────────────────────────────────── */
function _serviceReminders(sr) {
  if (!sr) return;
  _set("sr-overdue", sr.overdue);
  _set("sr-soon",    sr.due_soon);
  const total = (sr.overdue + sr.due_soon) || 1;
  const bar = _id("sr-bar");
  if (bar) bar.style.width = _pct(sr.overdue, total) + "%";
}

/* ── Work Orders ────────────────────────────────────────── */
function _workOrders(wo) {
  if (!wo) return;
  _set("wo-open",    wo.open);
  _set("wo-overdue", wo.overdue);
  _set("wo-done",    wo.completed_week);
}

/* ── Time to Resolve ────────────────────────────────────── */
function _ttr(ttr) {
  if (!ttr) return;
  _set("ttr-num",   ttr.avg_days + "d");
  _set("ttr-trend", "↓ " + ttr.trend);
}

/* ── Repair Priority Trend (static demo) ─────────────────── */
function _renderTrendChart() {
  const el = _id("trend-chart");
  if (!el) return;
  /* Heights in px for 6 months: [no_priority, emergency, non_sched, scheduled] */
  const months = [
    [18, 13,  9, 30],
    [16, 15, 11, 28],
    [14, 17, 13, 26],
    [12, 19, 16, 24],
    [10, 21, 18, 21],
    [ 9, 24, 20, 16],
  ];
  const colors = ["#d0d4d8", "#E24B4A", "#EF9F27", "#2BBFBF"];
  el.innerHTML = months.map(m => {
    const segs = m.map((h, i) =>
      `<div class="tc-seg" style="height:${h}px;background:${colors[i]};opacity:${i===3?1:.85}"></div>`
    ).join("");
    return `<div class="tc-col">${segs}</div>`;
  }).join("");
}

/* ── On-Time Compliance ─────────────────────────────────── */
function _compliance(c) {
  if (!c) return;
  _set("comp-all", c.all_time + "%");
  _set("comp-30",  c.last_30  + "%");
}

/* ── Inspections Pie ────────────────────────────────────── */
function _inspections(ins) {
  if (!ins) return;
  _set("insp-pass", `Passed (${ins.passed}%)`);
  _set("insp-fail", `Failed (${ins.failed}%)`);
  _set("insp-inc",  `Incomplete (${ins.incomplete}%)`);

  const C = 2 * Math.PI * 26; /* circumference ≈ 163.4 */
  const seg = p => (p / 100) * C;
  const p = ins.passed, f = ins.failed, inc = ins.incomplete;
  const svg = _id("pie-svg");
  if (!svg) return;
  svg.innerHTML = `
    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="12"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#2BBFBF" stroke-width="12"
      stroke-dasharray="${seg(p)} ${C}" stroke-dashoffset="0"
      transform="rotate(-90 32 32)"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#E24B4A" stroke-width="12"
      stroke-dasharray="${seg(f)} ${C}" stroke-dashoffset="${-seg(p)}"
      transform="rotate(-90 32 32)"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#EF9F27" stroke-width="12"
      stroke-dasharray="${seg(inc)} ${C}" stroke-dashoffset="${-(seg(p)+seg(f))}"
      transform="rotate(-90 32 32)"/>
  `;
}

/* ── Fuel Costs ─────────────────────────────────────────── */
function _fuelCosts(data) {
  if (!data || !data.length) return;
  const barsEl   = _id("fuel-bars");
  const monthsEl = _id("fuel-months");
  if (!barsEl) return;

  const max  = Math.max(...data.map(d => d.total));
  const last = data[data.length - 1];
  _set("fuel-total", "₹" + _fmt(last.total));
  _set("fuel-trend", last.month + " ↑");

  barsEl.innerHTML = data.map((d, i) => {
    const h   = Math.max(Math.round((d.total / max) * 54), 6);
    const hi  = i === data.length - 1;
    return `<div class="fb${hi ? " hi2" : ""}" style="height:${h}px"
                 title="${d.month}: ₹${_fmt(d.total)}">
      ${hi ? `<span class="fb-tip">${d.month}</span>` : ""}
    </div>`;
  }).join("");

  if (monthsEl) {
    monthsEl.innerHTML = data.map(d =>
      `<span class="fuel-mo">${d.month}</span>`).join("");
  }
}

/* ── Vehicle Assignments ────────────────────────────────── */
function _assignments(va) {
  if (!va) return;
  _set("va-assigned",   va.assigned);
  _set("va-unassigned", va.unassigned);
  _set("va-total",      _fmt(va.total) + " total");
  const pct = _pct(va.assigned, va.total);
  _set("va-pct", pct + "% utilization");
  const bar = _id("va-bar");
  if (bar) bar.style.width = pct + "%";
}

/* ── Smart Assessments ──────────────────────────────────── */
function _assessments(list) {
  const el = _id("assess-list");
  if (!el || !list) return;
  const cls  = { "Requires review":"tag-warn", "Unacceptable":"tag-bad", "Acceptable":"tag-good" };
  const ico  = { "Requires review":"⚠", "Unacceptable":"✖", "Acceptable":"✔" };
  el.innerHTML = list.map(a => `
    <div class="assess-row">
      <div class="assess-icon">${ico[a.tag] || "🔧"}</div>
      <div class="assess-info">
        <div class="assess-id">${frappe.utils.escape_html(a.name)} · Vehicle #${frappe.utils.escape_html(a.vehicle)}</div>
        <div class="assess-name">${frappe.utils.escape_html(a.description)}</div>
      </div>
      <span class="assess-tag ${cls[a.tag]||"tag-warn"}">${frappe.utils.escape_html(a.tag)}</span>
    </div>`).join("");
}