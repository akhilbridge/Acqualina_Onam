import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeCategory(category: string) {
  const normalized = normalizeText(category).toLowerCase();

  if (normalized === "mens" || normalized === "men" || normalized === "gents") {
    return "gents";
  }

  if (normalized === "ladies" || normalized === "women") {
    return "ladies";
  }

  if (normalized === "boys" || normalized === "jr boys" || normalized === "jr. boys") {
    return "boys";
  }

  if (normalized === "girls" || normalized === "jr girls" || normalized === "jr. girls") {
    return "girls";
  }

  return normalized;
}

function isEligibleForEvent(playerCategory: string, eventCategory: string) {
  const normalizedPlayerCategory = normalizeCategory(playerCategory);
  const normalizedEventCategory = normalizeText(eventCategory).toLowerCase();

  if (!normalizedEventCategory || normalizedEventCategory === "open") {
    return true;
  }

  if (normalizedEventCategory.includes("kids mixed")) {
    return normalizedPlayerCategory === "boys" || normalizedPlayerCategory === "girls";
  }

  if (normalizedEventCategory.includes("kids")) {
    return normalizedPlayerCategory === "boys" || normalizedPlayerCategory === "girls";
  }

  if (normalizedEventCategory.includes("adults")) {
    return normalizedPlayerCategory === "gents" || normalizedPlayerCategory === "ladies";
  }

  if (normalizedEventCategory.includes("gents")) {
    return normalizedPlayerCategory === "gents";
  }

  if (normalizedEventCategory.includes("ladies")) {
    return normalizedPlayerCategory === "ladies";
  }

  if (normalizedEventCategory.includes("boys")) {
    return normalizedPlayerCategory === "boys";
  }

  if (normalizedEventCategory.includes("girls")) {
    return normalizedPlayerCategory === "girls";
  }

  return true;
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "";
  }

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    ""
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Supabase function environment is incomplete." }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: appSettings, error: appSettingsError } = await adminClient
      .from("app_settings")
      .select("public_registration_locked")
      .eq("id", "global")
      .maybeSingle();

    if (appSettingsError) {
      return jsonResponse({ error: appSettingsError.message }, 400);
    }

    if (appSettings?.public_registration_locked) {
      return jsonResponse({ error: "Public sports registration is currently locked." }, 423);
    }

    const payload = await request.json();
    const villaNumber = normalizeText(payload.villaNumber);
    const playerId = normalizeText(payload.playerId);
    const sportEventIds = Array.isArray(payload.sportEventIds)
      ? Array.from(
          new Set(
            payload.sportEventIds
              .map((value) => normalizeText(value))
              .filter(Boolean),
          ),
        )
      : [];

    if (!villaNumber || !playerId) {
      return jsonResponse({ error: "Villa number and player are required." }, 400);
    }

    if (sportEventIds.length === 0) {
      return jsonResponse({ error: "Choose at least one sports event." }, 400);
    }

    const { data: player, error: playerError } = await adminClient
      .from("players")
      .select("id, name, villa_number, category")
      .eq("id", playerId)
      .maybeSingle();

    if (playerError) {
      return jsonResponse({ error: playerError.message }, 400);
    }

    if (!player) {
      return jsonResponse({ error: "Selected player was not found." }, 404);
    }

    if (normalizeText(player.villa_number) !== villaNumber) {
      return jsonResponse({ error: "Selected player does not belong to the chosen villa number." }, 400);
    }

    const { data: sportEvents, error: sportEventsError } = await adminClient
      .from("sports_events")
      .select("id, name, event_category, status")
      .in("id", sportEventIds);

    if (sportEventsError) {
      return jsonResponse({ error: sportEventsError.message }, 400);
    }

    if ((sportEvents ?? []).length !== sportEventIds.length) {
      return jsonResponse({ error: "One or more selected sports events were not found." }, 404);
    }

    const invalidEvent = (sportEvents ?? []).find((sportEvent) => {
      if (sportEvent.status === "completed") {
        return true;
      }

      return !isEligibleForEvent(player.category, sportEvent.event_category ?? "Open");
    });

    if (invalidEvent) {
      return jsonResponse(
        { error: `${invalidEvent.name} is not eligible for the selected player.` },
        400,
      );
    }

    const { data: createdSubmission, error: submissionError } = await adminClient
      .from("public_event_interest_submissions")
      .insert({
        villa_number: villaNumber,
        player_id: player.id,
        player_name: player.name,
        player_category: player.category,
        ip_address: getRequestIp(request),
        user_agent: request.headers.get("user-agent") ?? "",
      })
      .select("id")
      .single();

    if (submissionError || !createdSubmission) {
      return jsonResponse(
        { error: submissionError?.message ?? "Interest submission could not be saved." },
        400,
      );
    }

    const submissionEvents = sportEventIds.map((sportEventId) => ({
      submission_id: createdSubmission.id,
      sport_event_id: sportEventId,
    }));

    const { error: submissionEventsError } = await adminClient
      .from("public_event_interest_submission_events")
      .insert(submissionEvents);

    if (submissionEventsError) {
      return jsonResponse({ error: submissionEventsError.message }, 400);
    }

    return jsonResponse({
      submissionId: createdSubmission.id,
      playerName: player.name,
      selectedEventCount: sportEventIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
