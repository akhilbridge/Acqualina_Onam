import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedRoles = new Set(["captain", "moderator", "player"]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Supabase function environment is incomplete." }, 500);
    }

    if (!authorization) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "You must be logged in to create user accounts." }, 401);
    }

    const { data: callerProfile, error: callerError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (callerError) {
      return jsonResponse({ error: callerError.message }, 400);
    }

    if (callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Only admins can create user accounts." }, 403);
    }

    const payload = await request.json();
    const fullName = String(payload.fullName ?? "").trim();
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "");
    const role = String(payload.role ?? "").trim().toLowerCase();
    const teamId =
      typeof payload.teamId === "string" && payload.teamId.trim().length > 0
        ? payload.teamId.trim()
        : null;

    if (!fullName || !email || password.length < 8) {
      return jsonResponse(
        { error: "Full name, email, and a password with at least 8 characters are required." },
        400,
      );
    }

    if (!allowedRoles.has(role)) {
      return jsonResponse({ error: "Role must be captain, moderator, or player." }, 400);
    }

    if (teamId) {
      const { data: teamRow, error: teamError } = await adminClient
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .maybeSingle();

      if (teamError) {
        return jsonResponse({ error: teamError.message }, 400);
      }

      if (!teamRow) {
        return jsonResponse({ error: "Selected team was not found." }, 404);
      }
    }

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return jsonResponse({ error: "A user with that email already exists." }, 409);
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    });

    if (createError || !createdUser.user) {
      return jsonResponse({ error: createError?.message ?? "User could not be created." }, 400);
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        user_id: createdUser.user.id,
        email,
        full_name: fullName,
        role,
        team_id: teamId,
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 400);
    }

    return jsonResponse({
      userId: createdUser.user.id,
      email,
      fullName,
      role,
      teamId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
