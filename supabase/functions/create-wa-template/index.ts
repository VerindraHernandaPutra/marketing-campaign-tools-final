import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      organizationId, name, category, language,
      body, bodySamples, footer,
      headerType, headerText, imageBase64, imageMimeType,
    } = await req.json();

    // Load WhatsApp credentials from DB
    const { data: integration } = await supabase
      .from("organization_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("platform", "whatsapp")
      .maybeSingle();

    if (!integration?.access_token || !integration.metadata?.waba_id) {
      throw new Error("WhatsApp not connected or missing credentials");
    }

    const accessToken: string = integration.access_token;
    const wabaId: string = integration.metadata.waba_id;
    const components: Record<string, unknown>[] = [];

    // ── IMAGE HEADER ──────────────────────────────────────────────────────────
    if (headerType === "IMAGE" && imageBase64) {
      // Get App ID via token debug endpoint
      const debugRes = await fetch(
        `https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
      );
      const debugData = await debugRes.json();
      const appId: string | undefined = debugData?.data?.app_id;
      if (!appId) throw new Error("Could not determine App ID from access token. Ensure the system user token has app permissions.");

      const mimeType = imageMimeType || "image/jpeg";
      const fileExt = mimeType === "image/png" ? "png" : "jpg";
      const imageBytes = Uint8Array.from(atob(imageBase64), (c: string) => c.charCodeAt(0));

      // Step 1: Create upload session
      const sessionRes = await fetch(
        `https://graph.facebook.com/v19.0/${appId}/uploads?file_name=header.${fileExt}&file_length=${imageBytes.length}&file_type=${mimeType}&access_token=${accessToken}`,
        { method: "POST" }
      );
      const sessionData = await sessionRes.json();
      if (sessionData.error) throw new Error(`Upload session error: ${sessionData.error.message}`);

      // Step 2: Upload file bytes
      const uploadRes = await fetch(
        `https://rupload.facebook.com/whatsapp-business-upload/${sessionData.id}`,
        {
          method: "POST",
          headers: {
            "Authorization": `OAuth ${accessToken}`,
            "file_offset": "0",
            "Content-Type": mimeType,
          },
          body: imageBytes,
        }
      );
      const uploadData = await uploadRes.json();
      if (!uploadData.h) throw new Error("Image upload failed: " + JSON.stringify(uploadData));

      components.push({
        type: "HEADER",
        format: "IMAGE",
        example: { header_handle: [uploadData.h] },
      });

    // ── TEXT HEADER ───────────────────────────────────────────────────────────
    } else if (headerType === "TEXT" && headerText) {
      components.push({ type: "HEADER", format: "TEXT", text: headerText });
    }

    // ── BODY ──────────────────────────────────────────────────────────────────
    const bodyComp: Record<string, unknown> = { type: "BODY", text: body };
    if (Array.isArray(bodySamples) && bodySamples.length > 0) {
      bodyComp.example = { body_text: [bodySamples] };
    }
    components.push(bodyComp);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    if (footer) components.push({ type: "FOOTER", text: footer });

    // ── CREATE TEMPLATE ───────────────────────────────────────────────────────
    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, category, language, components }),
      }
    );
    const createData = await createRes.json();
    if (createData.error) throw new Error(createData.error.message);

    return new Response(
      JSON.stringify({ success: true, id: createData.id, status: createData.status }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
