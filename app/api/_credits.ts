export type CreditLedgerEntry = { kind: string; amount: number; status: string; jobId?: string | null };
export type CreditReservation = { id: string; amount: number; jobId: string | null; state: "reserved" | "released" | "settled" };
type CreditRuntime = typeof globalThis & { __bosonfieldCredits?: { balance: number; ledger: CreditLedgerEntry[]; reservations: Map<string, CreditReservation> } };
const runtime = globalThis as CreditRuntime;
export const credits = runtime.__bosonfieldCredits ?? (runtime.__bosonfieldCredits = { balance: 480, ledger: [{ kind: "grant", amount: 480, status: "available" }], reservations: new Map() });
export function releaseReservation(id: string) {
  const reservation = credits.reservations.get(id);
  if (!reservation) return null;
  if (reservation.state !== "reserved") return reservation;
  reservation.state = "released";
  credits.balance += reservation.amount;
  credits.ledger.push({ kind: "release", amount: reservation.amount, status: "available", jobId: reservation.jobId });
  return reservation;
}
export function releaseJobReservation(jobId: string) {
  const reservation = [...credits.reservations.values()].find((entry) => entry.jobId === jobId && entry.state === "reserved");
  return reservation ? releaseReservation(reservation.id) : null;
}
