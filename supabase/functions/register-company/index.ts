import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface RegisterCompanyPayload {
  email: string;
  password: string;
  full_name: string;
  establishment_name: string;
  phone: string;
  /** Optional redirect after email confirm (ignored when auto-confirm is on). */
  email_redirect_to?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function humanizeAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("already registered") || text.includes("already been registered") || text.includes("already exists") || text.includes("duplicate")) {
    return "Ese correo ya está registrado.";
  }
  if (text.includes("password") && (text.includes("6") || text.includes("short"))) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (text.includes("invalid email") || text.includes("unable to validate email")) {
    return "El correo no es válido.";
  }
  return message;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Método no permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Configuración interna de Supabase incompleta." }, 500);
    }

    const body = (await req.json()) as RegisterCompanyPayload;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const establishmentName =
      typeof body.establishment_name === "string" ? body.establishment_name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const emailRedirectTo =
      typeof body.email_redirect_to === "string" && body.email_redirect_to.trim()
        ? body.email_redirect_to.trim()
        : undefined;

    if (!email || !password || !fullName || !establishmentName || !phone) {
      return jsonResponse({ error: "Completa todos los campos obligatorios." }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    }

    if (establishmentName.length < 2) {
      return jsonResponse({ error: "El nombre del establecimiento no es válido." }, 400);
    }

    // Public endpoint: never accept role / company_id from the client.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: nameAvailable, error: nameError } = await adminClient.rpc(
      "is_company_name_available",
      { p_name: establishmentName },
    );

    if (nameError) {
      return jsonResponse(
        { error: "No se pudo comprobar el nombre de la empresa.", detail: nameError.message },
        500,
      );
    }

    if (nameAvailable !== true) {
      return jsonResponse(
        { error: "Ya existe una empresa registrada con ese nombre comercial." },
        409,
      );
    }

    // Prefer Auth signUp (anon) so Confirm-email / SMTP behave like the previous client path.
    // Metadata: establishment_name only — handle_new_user creates company + ADMIN.
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await anonClient.auth.signUp({
      email,
      password,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          full_name: fullName,
          establishment_name: establishmentName,
          phone,
        },
      },
    });

    if (error) {
      return jsonResponse({ error: humanizeAuthError(error.message) }, 400);
    }

    const user = data.user;
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      return jsonResponse({ error: "Ese correo ya está registrado." }, 409);
    }

    const userId = user?.id;
    if (!userId) {
      return jsonResponse({ error: "Supabase no devolvió el usuario registrado." }, 500);
    }

    // Defense in depth: ensure profile is ADMIN for this company path (trigger should have run).
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role, company_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return jsonResponse(
        { error: "Registro creado, pero no se pudo verificar el perfil.", detail: profileError.message },
        500,
      );
    }

    if (!profile || profile.role !== "ADMIN" || !profile.company_id) {
      return jsonResponse(
        {
          error:
            "Registro incompleto: el perfil ADMIN de empresa no se creó. Revisa el trigger handle_new_user.",
          detail: `role=${profile?.role ?? "null"} company_id=${profile?.company_id ?? "null"}`,
        },
        500,
      );
    }

    const confirmationRequired = !data.session;

    return jsonResponse({
      success: true,
      userId,
      email,
      company_id: profile.company_id,
      confirmationRequired,
      hasSession: Boolean(data.session),
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error: "Se produjo un error interno al registrar la empresa.",
        detail: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
