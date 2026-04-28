import frappe

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
