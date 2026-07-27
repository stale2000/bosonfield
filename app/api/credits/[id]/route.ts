import { credits } from "../../_credits";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const reservation = credits.reservations.get(id);
  if (!reservation) return Response.json({ error: { code: "RESERVATION_NOT_FOUND", message: `Unknown reservation: ${id}` } }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { action?: "release" | "settle" };
  if (body.action !== "release" && body.action !== "settle") return Response.json({ error: { code: "INPUT_INVALID", message: "action must be release or settle" } }, { status: 400 });
  if (reservation.state !== "reserved") return Response.json({ reservation, remaining: credits.balance, mode: "dry-run" });
  reservation.state = body.action === "release" ? "released" : "settled";
  if (body.action === "release") {
    credits.balance += reservation.amount;
    credits.ledger.push({ kind: "release", amount: reservation.amount, status: "available", jobId: reservation.jobId });
  } else credits.ledger.push({ kind: "settlement", amount: -reservation.amount, status: "settled", jobId: reservation.jobId });
  return Response.json({ reservation, remaining: credits.balance, mode: "dry-run" });
}
