export function GET() {
  const runtime = globalThis as typeof globalThis & { __bosonfieldCredits?: { balance: number; reservations?: Map<string, { amount: number; state: string }> } };
  const ledger = runtime.__bosonfieldCredits;
  const available = ledger?.balance ?? 480;
  const reserved = ledger?.reservations ? [...ledger.reservations.values()].filter((entry) => entry.state === "reserved").reduce((total, entry) => total + entry.amount, 0) : 480 - available;
  return Response.json({ plan: { id: "dry-starter", name: "Dry Starter", status: "active", renewsAt: null }, credits: { available, reserved, currency: "credit" }, portalUrl: null, mode: "dry-run" });
}
