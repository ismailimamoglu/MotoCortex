import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AiDoctorRequest {
  dtcCodes: string[];
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  engineVoltage?: number;
  coolantTemp?: number;
  freezeFrameData?: Record<string, string>;
  lang?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: AiDoctorRequest = await req.json();
    const { dtcCodes, vehicleMake, vehicleModel, vehicleYear, engineVoltage, coolantTemp, freezeFrameData, lang = 'en' } = body;

    // Server-side secret key from Supabase Environment Secrets
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SERVER_SECRET_MISSING: GEMINI_API_KEY is not set in Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dtcCodes || !Array.isArray(dtcCodes) || dtcCodes.length === 0) {
      return new Response(
        JSON.stringify({ error: "BAD_REQUEST: dtcCodes array is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are MotoCortex AI Mechanic. Analyze vehicle diagnostic data and output strict JSON in language code '${lang}'.
Vehicle: ${vehicleYear || ''} ${vehicleMake || 'Motorcycle/Car'} ${vehicleModel || ''}
DTC Codes: ${dtcCodes.join(', ')}
Voltage: ${engineVoltage || 'N/A'}V, Coolant Temp: ${coolantTemp || 'N/A'}°C
Freeze Frame: ${JSON.stringify(freezeFrameData || {})}

Return JSON structure:
{
  "title": "Short title",
  "summary": "2 sentence diagnostic summary",
  "causes": ["cause 1", "cause 2"],
  "recommendedSteps": ["step 1", "step 2"],
  "estimatedCostRange": "$50 - $150",
  "canDriveSafetyText": "Advice on whether driving to repair shop is safe"
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: `GEMINI_API_ERROR: ${geminiResponse.status} - ${errorText}` }),
        { status: geminiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await geminiResponse.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return new Response(
        JSON.stringify({ error: "EMPTY_AI_RESPONSE: Candidate output text was empty." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedData = JSON.parse(textResponse);

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `SERVER_ERROR: ${err?.message || err}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
