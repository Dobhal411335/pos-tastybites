import Employee from "@/models/employee/Employee";

export function formatEmployeeActorName(emp) {
  if (!emp) return null;
  if (emp.name && String(emp.name).trim()) return String(emp.name).trim();
  const joined = [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim();
  return joined || null;
}

function actorTypeFromRole(role, fallback = "Employee") {
  const r = String(role || "").toUpperCase();
  if (
    r === "ADMIN" ||
    r === "SUPER ADMIN" ||
    r === "MANAGER TERMINAL" ||
    r.includes("ADMIN") ||
    r.includes("MANAGER")
  ) {
    return "Admin";
  }
  return fallback;
}

/**
 * Resolve actorId + display name for OperationalAuditLog writes.
 * Auth only attaches { id, role }, so we look up Employee when name is missing.
 */
export async function resolveOperationalActor(
  request,
  { actorType } = {}
) {
  const actorId = request?.user?.id || request?.employeeId || null;
  let actorName =
    request?.user?.name ||
    [request?.user?.firstName, request?.user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    null;

  if (!actorName && actorId) {
    const emp = await Employee.findById(actorId)
      .select("firstName lastName")
      .lean();
    actorName = formatEmployeeActorName(emp);
  }

  return {
    actorId,
    actorType:
      actorType ||
      actorTypeFromRole(request?.user?.role || request?.role, "Employee"),
    actorName: actorName || null,
  };
}

/**
 * Fill missing actorName on audit docs by batch-looking up actorId.
 * Mutates nothing; returns a Map id -> name.
 */
export async function resolveActorNamesByIds(actorIds = []) {
  const ids = [
    ...new Set(
      (actorIds || [])
        .map((id) => (id != null ? String(id) : ""))
        .filter(Boolean)
    ),
  ];
  if (!ids.length) return new Map();

  const emps = await Employee.find({ _id: { $in: ids } })
    .select("firstName lastName")
    .lean();

  return new Map(
    emps.map((emp) => [String(emp._id), formatEmployeeActorName(emp)])
  );
}

export function displayActorName(actorName, fallback = "Unknown") {
  const trimmed = String(actorName || "").trim();
  return trimmed || fallback;
}
