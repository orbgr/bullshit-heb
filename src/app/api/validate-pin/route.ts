import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MAX_PLAYERS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const supabase = createServiceClient();
  const upperPin = (pin as string).toUpperCase();

  const { data: game } = await supabase
    .from("games")
    .select("pin, state")
    .eq("pin", upperPin)
    .single();

  if (!game) {
    return NextResponse.json({ error: "קוד משחק שגוי" }, { status: 404 });
  }

  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("game_pin", upperPin);

  if ((count ?? 0) >= MAX_PLAYERS) {
    return NextResponse.json({ error: "מצטערים, המשחק מלא" }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}
