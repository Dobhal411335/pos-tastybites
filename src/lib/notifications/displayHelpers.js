export function formatClockTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function notificationMetaLine(n) {
  const parts = [];
  if (n.metadata?.employeeName) {
    parts.push(
      n.metadata.employeeRole
        ? `${n.metadata.employeeName} · ${n.metadata.employeeRole}`
        : n.metadata.employeeName
    );
  }
  if (n.metadata?.orderNumber) parts.push(`Order #${n.metadata.orderNumber}`);
  if (n.metadata?.tableNo) {
    const table = String(n.metadata.tableNo).trim();
    parts.push(/^tables?\b/i.test(table) ? table : `Table ${table}`);
  }
  return parts.join(" • ");
}

export function employeeActivityTimeLabel(n) {
  if (n.type === "EMPLOYEE_LOGIN") {
    const at = n.metadata?.loginTime || n.createdAt;
    return at ? `Clocked in at ${formatClockTime(at)}` : null;
  }
  if (n.type === "EMPLOYEE_LOGOUT") {
    const at = n.metadata?.logoutTime || n.createdAt;
    return at ? `Clocked out at ${formatClockTime(at)}` : null;
  }
  return null;
}

export function notificationMessageLine(n) {
  const activityTime = employeeActivityTimeLabel(n);
  if (n.type === "EMPLOYEE_LOGIN") {
    return activityTime || n.message;
  }
  if (n.type === "EMPLOYEE_LOGOUT") {
    const duration = n.metadata?.durationLabel;
    return [activityTime, duration ? `On shift ${duration}` : null]
      .filter(Boolean)
      .join(" · ");
  }
  return n.message;
}

export function notificationTimeLabel(n) {
  if (n.type === "EMPLOYEE_LOGIN") {
    return formatClockTime(n.metadata?.loginTime || n.createdAt);
  }
  if (n.type === "EMPLOYEE_LOGOUT") {
    return formatClockTime(n.metadata?.logoutTime || n.createdAt);
  }
  return null;
}
