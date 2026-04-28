/* ============================================================
   UBS Fleet Dashboard — fleet_dashboard.js
   Fetches live data via frappe.call → ubs_theme.www.fleet_dashboard.get_dashboard_data
   ============================================================ */

frappe.ready(function () {

  /* Mark body so CSS hides Frappe chrome */
  document.body.classList.add("fleet-dashboard-page");

  /* ── User info ─────────────────────────────────────── */
  const userName  = frappe.session.user_fullname || frappe.session.user || "Admin";
  const initials  = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  _el("sb-user-name")     && (_el("sb-user-name").textContent     = userName);
  _el("sb-user-initials") && (_el("sb-user-initials").textContent = initials);

  /* ── Sync timestamp ─────────────────────────────────── */
  _el("tb-sync-time") && (_el("tb-sync-time").textContent =
    "Updated " + frappe.datetime.now_datetime());

  /* ── Fetch dashboard data ────────────────────────────── */
  frappe.call({
    method: "ubs_theme.www.fleet_dashboard.get_dashboard_data",
    freeze: false,
    callback: function (r) {
      if (!r.message) {
        frappe.msgprint("Could not load dashboard data.");
        return;
      }
      const d = r.message;
      _renderVehicleStatus(d.vehicle_status);
      _renderServiceReminders(d.service_reminders);
      _renderWorkOrders(d.work_orders);
      _renderTimeToResolve(d.time_to_resolve);
      _renderTrendChart();          // uses static demo data (no ERPNext doctype yet)
      _renderCompliance(d.compliance);
      _renderInspections(d.inspections);
      _renderFuelCosts(d.fuel_costs);
      _renderAssignments(d.assignments);
      _renderAssessments(d.assessments);
      /* Update sidebar fleet badge */
      if (d.vehicle_status) {
        _el("sb-fleet-count") &&
          (_el("sb-fleet-count").textContent = d.vehicle_status.active || "—");
      }
      if (d.work_orders) {
        _el("sb-wo-count") &&
          (_el("sb-wo-count").textContent = d.work_orders.overdue || "—");
      }
    }
  });
});

/* ── Helpers ────────────────────────────────────────────── */
function _el(id)       { return document.getElementById(id); }
function _fmt(n)       { return Number(n).toLocaleString("en-IN"); }
function _pct(a, b)    { return b ? Math.round(a / b * 100) : 0; }

/* ── Vehicle Status ─────────────────────────────────────── */
function _renderVehicleStatus(vs) {
  if (!vs) return;
  const total = vs.total || 1;
  const map = [
    ["vs-active",   "bar-active",   vs.active,         "92"],
    ["vs-inactive", "bar-inactive", vs.inactive,        _pct(vs.inactive, total)],
    ["vs-shop",     "bar-shop",     vs.in_shop,         _pct(vs.in_shop, total)],
    ["vs-oos",      "bar-oos",      vs.out_of_service,  _pct(vs.out_of_service, total)],
  ];
  map.forEach(([cntId, barId, val, pct]) => {
    _el(cntId) && (_el(cntId).textContent = _fmt(val));
    _el(barId) && (_el(barId).style.width = Math.max(pct, 3) + "%");
  });
}

/* ── Service Reminders ──────────────────────────────────── */
function _renderServiceReminders(sr) {
  if (!sr) return;
  _el("sr-overdue")  && (_el("sr-overdue").textContent  = sr.overdue);
  _el("sr-due-soon") && (_el("sr-due-soon").textContent = sr.due_soon);
  const total = (sr.overdue + sr.due_soon) || 1;
  _el("sr-bar") && (_el("sr-bar").style.width =
    Math.round(sr.overdue / total * 100) + "%");
}

/* ── Work Orders ────────────────────────────────────────── */
function _renderWorkOrders(wo) {
  if (!wo) return;
  _el("wo-open")      && (_el("wo-open").textContent      = wo.open);
  _el("wo-overdue")   && (_el("wo-overdue").textContent   = wo.overdue);
  _el("wo-completed") && (_el("wo-completed").textContent = wo.completed_week);
}

/* ── Time to Resolve ────────────────────────────────────── */
function _renderTimeToResolve(ttr) {
  if (!ttr) return;
  _el("ttr-days")  && (_el("ttr-days").textContent  = ttr.avg_days + "d");
  _el("ttr-trend") && (_el("ttr-trend").textContent = "↓ " + ttr.trend);
}

/* ── Repair Priority Trend (static demo bars) ───────────── */
function _renderTrendChart() {
  const el = _el("trend-chart");
  if (!el) return;
  // Each month: [no_priority, emergency, non_sched, scheduled] as % heights
  const months = [
    { lbl: "Jul", v: [18, 14, 10, 28] },
    { lbl: "Aug", v: [16, 16, 12, 26] },
    { lbl: "Sep", v: [14, 18, 14, 24] },
    { lbl: "Oct", v: [12, 20, 16, 22] },
    { lbl: "Nov", v: [10, 22, 18, 20] },
    { lbl: "Dec", v: [10, 24, 20, 16] },
  ];
  const colors = ["#d0d4d8", "#E24B4A", "#EF9F27", "#2BBFBF"];
  el.innerHTML = months.map(m => {
    const bars = m.v.map((h, i) =>
      `<div class="tc-seg" style="height:${h}px;background:${colors[i]}" title="${m.lbl}"></div>`
    ).join("");
    return `<div class="tc-col">${bars}</div>`;
  }).join("");
}

/* ── On-Time Compliance ─────────────────────────────────── */
function _renderCompliance(c) {
  if (!c) return;
  _el("comp-alltime") && (_el("comp-alltime").textContent = c.all_time + "%");
  _el("comp-30d")     && (_el("comp-30d").textContent     = c.last_30  + "%");
}

/* ── Inspections Pie ────────────────────────────────────── */
function _renderInspections(ins) {
  if (!ins) return;
  _el("insp-passed")     && (_el("insp-passed").textContent     = `Passed (${ins.passed}%)`);
  _el("insp-failed")     && (_el("insp-failed").textContent     = `Failed (${ins.failed}%)`);
  _el("insp-incomplete") && (_el("insp-incomplete").textContent = `Incomplete (${ins.incomplete}%)`);

  // Redraw SVG pie arcs
  const circ = 2 * Math.PI * 26;           // 163.4
  const seg = p => (p / 100) * circ;
  const p = ins.passed, f = ins.failed, inc = ins.incomplete;
  const svgEl = _el("pie-svg");
  if (!svgEl) return;
  svgEl.innerHTML = `
    <circle cx="32" cy="32" r="26" fill="none" stroke="#eef0f2" stroke-width="12"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#2BBFBF" stroke-width="12"
      stroke-dasharray="${seg(p)} ${circ}" stroke-dashoffset="${-circ * 0}"
      transform="rotate(-90 32 32)"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#E24B4A" stroke-width="12"
      stroke-dasharray="${seg(f)} ${circ}" stroke-dashoffset="${-seg(p)}"
      transform="rotate(-90 32 32)"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#EF9F27" stroke-width="12"
      stroke-dasharray="${seg(inc)} ${circ}" stroke-dashoffset="${-(seg(p)+seg(f))}"
      transform="rotate(-90 32 32)"/>
  `;
}

/* ── Fuel Costs ─────────────────────────────────────────── */
function _renderFuelCosts(data) {
  if (!data || !data.length) return;
  const barsEl   = _el("fuel-bars");
  const totalEl  = _el("fuel-total");
  const trendEl  = _el("fuel-trend");
  if (!barsEl) return;

  const max = Math.max(...data.map(d => d.total));
  const last = data[data.length - 1];

  totalEl && (totalEl.textContent = "₹" + _fmt(last.total));
  trendEl && (trendEl.textContent = last.lbl + " ↑");

  barsEl.innerHTML = data.map((d, i) => {
    const h = Math.round((d.total / max) * 56);
    const isLast = i === data.length - 1;
    return `<div class="fb${isLast ? " hi" : ""}" style="height:${h}px" title="${d.month}: ₹${_fmt(d.total)}">
      ${isLast ? `<span class="fb-tip">${d.month}</span>` : ""}
    </div>`;
  }).join("");

  // Month labels row
  const monthsRow = document.createElement("div");
  monthsRow.className = "fuel-months";
  monthsRow.innerHTML = data.map(d =>
    `<span class="fuel-month">${d.month}</span>`).join("");
  barsEl.parentNode.appendChild(monthsRow);
}

/* ── Vehicle Assignments ────────────────────────────────── */
function _renderAssignments(va) {
  if (!va) return;
  _el("va-assigned")   && (_el("va-assigned").textContent   = va.assigned);
  _el("va-unassigned") && (_el("va-unassigned").textContent = va.unassigned);
  _el("va-total")      && (_el("va-total").textContent      = _fmt(va.total) + " total");
  const pct = _pct(va.assigned, va.total);
  _el("va-pct")  && (_el("va-pct").textContent  = pct + "% utilization");
  _el("va-bar")  && (_el("va-bar").style.width  = pct + "%");
}

/* ── Smart Assessments ──────────────────────────────────── */
function _renderAssessments(list) {
  const el = _el("assessments-list");
  if (!el || !list) return;

  const tagClass = { "Requires review": "tag-warn", "Unacceptable": "tag-bad", "Acceptable": "tag-good" };
  const icons = { "Requires review": "⚠️", "Unacceptable": "🔴", "Acceptable": "✅" };

  el.innerHTML = list.map(a => `
    <div class="assess-row">
      <div class="assess-icon">${icons[a.tag] || "🔧"}</div>
      <div class="assess-info">
        <div class="assess-id">${frappe.utils.escape_html(a.name)} · Vehicle #${frappe.utils.escape_html(a.vehicle)}</div>
        <div class="assess-name">${frappe.utils.escape_html(a.description)}</div>
      </div>
      <span class="assess-tag ${tagClass[a.tag] || "tag-warn"}">${frappe.utils.escape_html(a.tag)}</span>
    </div>
  `).join("");
}