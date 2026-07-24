export function generateStaffOrderNumber() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `STAFF-ORD-${randomNum}`;
}
