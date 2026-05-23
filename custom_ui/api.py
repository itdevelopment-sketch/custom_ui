import frappe

DEFAULT_LANDING_WORKSPACE = "Fleet Management"


@frappe.whitelist()
def get_total_distance():
    value = frappe.db.sql("""
        SELECT SUM(trip_distance)
        FROM `tabVehicle Run Summary`
        WHERE status = 'Completed'
    """)[0][0] or 0

    return {
        "value": round(value)
    }


def set_default_landing_workspace(doc, method=None):
    if doc.name in ("Guest", "Administrator"):
        return
    if not doc.default_workspace:
        doc.default_workspace = DEFAULT_LANDING_WORKSPACE
