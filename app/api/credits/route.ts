import { invalid } from "../_dry-data";
import { credits, type CreditReservation } from "../_credits";


export function GET() {
  return Response.json({ balance: credits.balance, currency: "credit", ledger: credits.ledger, mode: "dry-run" });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { amount?: number; jobId?: string };
  if (!Number.isInteger(body.amount) || (body.amount ?? 0) <= 0) return invalid("amount must be a positive integer");
  if ((body.amount ?? 0) > credits.balance) return Response.json({ error: { code: "CREDITS_INSUFFICIENT", message: "Not enough credits" } }, { status: 409 });
  const reservation: CreditReservation = { id: `reservation_dry_${crypto.randomUUID()}`, amount: body.amount!, jobId: body.jobId ?? null, state: "reserved" };
  credits.balance -= reservation.amount;
  credits.reservations.set(reservation.id, reservation);
  credits.ledger.push({ kind: "reservation", amount: -reservation.amount, status: "reserved", jobId: reservation.jobId });
  return Response.json({ reservation, remaining: credits.balance, mode: "dry-run" }, { status: 201 });
}
