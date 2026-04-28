"""
UBS Travel - Custom ERPNext Home Page
Registered via hooks.py → home_page = "ubs_home"
"""

import frappe
from frappe import _


def get_context(context):
	"""Build context for UBS custom home page."""
	context.no_cache = 1
	context.show_sidebar = False

	# Live counts from ERPNext doctypes
	context.stats = _get_dashboard_stats()
	context.recent_invoices = _get_recent_invoices()
	context.quick_links = _get_quick_links()
	return context


def _get_dashboard_stats():
	"""Return key stats shown in the hero banner."""
	try:
		return {
			"customers": frappe.db.count("Customer", {"disabled": 0}),
			"suppliers": frappe.db.count("Supplier", {"disabled": 0}),
			"open_invoices": frappe.db.count(
				"Sales Invoice", {"status": ["in", ["Unpaid", "Overdue"]]}
			),
			"items": frappe.db.count("Item", {"disabled": 0}),
		}
	except Exception:
		return {"customers": 0, "suppliers": 0, "open_invoices": 0, "items": 0}


def _get_recent_invoices(limit=5):
	"""Return the 5 most recent Sales Invoices."""
	try:
		return frappe.get_list(
			"Sales Invoice",
			fields=["name", "customer", "grand_total", "status", "posting_date"],
			order_by="posting_date desc",
			limit_page_length=limit,
		)
	except Exception:
		return []


def _get_quick_links():
	"""Quick action links shown on the home page."""
	return [
		{
			"label": _("New Sales Invoice"),
			"icon": "🧾",
			"route": "/app/sales-invoice/new-sales-invoice-1",
			"desc": _("Bill a customer"),
			"color": "teal",
		},
		{
			"label": _("New Customer"),
			"icon": "👤",
			"route": "/app/customer/new-customer-1",
			"desc": _("Add a new client"),
			"color": "teal",
		},
		{
			"label": _("New Supplier"),
			"icon": "🏭",
			"route": "/app/supplier/new-supplier-1",
			"desc": _("Add a vendor"),
			"color": "red",
		},
		{
			"label": _("Stock Ledger"),
			"icon": "📦",
			"route": "/app/stock-ledger",
			"desc": _("View inventory movements"),
			"color": "teal",
		},
	]
