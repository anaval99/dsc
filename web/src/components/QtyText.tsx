/**
 * Renders a serialized rational qty ("3/2") as a nice fraction ("1½"),
 * identically to the app's qty_text. Falls back to the raw string if it can't
 * parse (defensive — a bad row never throws in render).
 */

import { parseRational, formatRational } from "@/lib/rational";

export function formatQty(qty: string): string {
  const r = parseRational(qty);
  return r ? formatRational(r) : qty;
}

export function QtyText({ qty, unit }: { qty: string; unit: string }) {
  const formatted = formatQty(qty);
  return (
    <span className="qty">
      {formatted}
      {unit ? <span className="qty-unit"> {unit}</span> : null}
    </span>
  );
}
