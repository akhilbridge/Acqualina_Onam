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
    return "Gents";
  }

  if (normalized === "ladies" || normalized === "women") {
    return "Ladies";
  }

  if (
    normalized === "jr boys" ||
    normalized === "jr. boys" ||
    normalized === "jrboys" ||
    normalized === "boys 6-9 yrs" ||
    normalized === "boys 6 to 9 yrs" ||
    normalized === "boys 6-9"
  ) {
    return "Boys 6-9 yrs";
  }

  if (
    normalized === "jr girls" ||
    normalized === "jr. girls" ||
    normalized === "jrgirls" ||
    normalized === "girls 6-9 yrs" ||
    normalized === "girls 6 to 9 yrs" ||
    normalized === "girls 6-9"
  ) {
    return "Girls 6-9 yrs";
  }

  if (
    normalized === "boys" ||
    normalized === "boys 10-15 yrs" ||
    normalized === "boys 10 to 15 yrs" ||
    normalized === "boys 10-15"
  ) {
    return "Boys 10-15 yrs";
  }

  if (
    normalized === "girls" ||
    normalized === "girls 10-15 yrs" ||
    normalized === "girls 10 to 15 yrs" ||
    normalized === "girls 10-15"
  ) {
    return "Girls 10-15 yrs";
  }

  return normalizeText(category);
}

function isEligibleForEvent(playerCategory: string, eventCategory: string) {
  const normalizedPlayerCategory = normalizeCategory(playerCategory);
  const normalizedEventCategory = normalizeCategory(eventCategory);

  if (!normalizedEventCategory || normalizedEventCategory.toLowerCase() === "open") {
    return true;
  }

  return normalizedPlayerCategory === normalizedEventCategory;
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
      .select("id, name, event_category, status, is_active")
      .in("id", sportEventIds);

    if (sportEventsError) {
      return jsonResponse({ error: sportEventsError.message }, 400);
    }

    if ((sportEvents ?? []).length !== sportEventIds.length) {
      return jsonResponse({ error: "One or more selected sports events were not found." }, 404);
    }

    const invalidEvent = (sportEvents ?? []).find((sportEvent) => {
      if (sportEvent.is_active === false) {
        return true;
      }

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

    const requestIp = getRequestIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";
    const { data: exactPlayerSubmissions, error: exactPlayerSubmissionsError } = await adminClient
      .from("public_event_interest_submissions")
      .select("id, created_at")
      .eq("player_id", player.id)
      .order("created_at", { ascending: false });

    if (exactPlayerSubmissionsError) {
      return jsonResponse({ error: exactPlayerSubmissionsError.message }, 400);
    }

    const { data: matchingPersonSubmissions, error: matchingPersonSubmissionsError } = await adminClient
      .from("public_event_interest_submissions")
      .select("id, created_at, player_id")
      .eq("villa_number", villaNumber)
      .eq("player_name", player.name)
      .eq("player_category", player.category)
      .order("created_at", { ascending: false });

    if (matchingPersonSubmissionsError) {
      return jsonResponse({ error: matchingPersonSubmissionsError.message }, 400);
    }

    const dedupedExistingSubmissions = Array.from(
      new Map(
        [...(exactPlayerSubmissions ?? []), ...(matchingPersonSubmissions ?? [])].map((submission) => [
          submission.id,
          submission,
        ]),
      ).values(),
    ).sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );

    const keeperSubmission = dedupedExistingSubmissions[0] ?? null;
    const duplicateSubmissionIds = dedupedExistingSubmissions
      .slice(1)
      .map((submission) => submission.id);

    if (duplicateSubmissionIds.length > 0) {
      const { error: deleteDuplicateSubmissionsError } = await adminClient
        .from("public_event_interest_submissions")
        .delete()
        .in("id", duplicateSubmissionIds);

      if (deleteDuplicateSubmissionsError) {
        return jsonResponse({ error: deleteDuplicateSubmissionsError.message }, 400);
      }
    }

    let submissionId = keeperSubmission?.id ?? "";
    let action: "created" | "updated" = keeperSubmission ? "updated" : "created";

    if (keeperSubmission) {
      const { error: updateSubmissionError } = await adminClient
        .from("public_event_interest_submissions")
        .update({
          villa_number: villaNumber,
          player_id: player.id,
          player_name: player.name,
          player_category: player.category,
          ip_address: requestIp,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
        })
        .eq("id", keeperSubmission.id);

      if (updateSubmissionError) {
        return jsonResponse({ error: updateSubmissionError.message }, 400);
      }

      const { error: deleteExistingEventLinksError } = await adminClient
        .from("public_event_interest_submission_events")
        .delete()
        .eq("submission_id", keeperSubmission.id);

      if (deleteExistingEventLinksError) {
        return jsonResponse({ error: deleteExistingEventLinksError.message }, 400);
      }
    } else {
      const { data: createdSubmission, error: submissionError } = await adminClient
        .from("public_event_interest_submissions")
        .insert({
          villa_number: villaNumber,
          player_id: player.id,
          player_name: player.name,
          player_category: player.category,
          ip_address: requestIp,
          user_agent: userAgent,
        })
        .select("id")
        .single();

      if (submissionError || !createdSubmission) {
        return jsonResponse(
          { error: submissionError?.message ?? "Interest submission could not be saved." },
          400,
        );
      }

      submissionId = createdSubmission.id;
    }

    const submissionEvents = sportEventIds.map((sportEventId) => ({
      submission_id: submissionId,
      sport_event_id: sportEventId,
    }));

    const { error: submissionEventsError } = await adminClient
      .from("public_event_interest_submission_events")
      .insert(submissionEvents);

    if (submissionEventsError) {
      return jsonResponse({ error: submissionEventsError.message }, 400);
    }

    return jsonResponse({
      action,
      submissionId,
      playerName: player.name,
      selectedEventCount: sportEventIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
