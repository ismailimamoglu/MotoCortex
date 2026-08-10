// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

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
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access: Bearer token required" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment secret missing on server." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const payload: AiDoctorRequest = await req.json();
    const lang = (payload.lang || "en").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10);
    const rawDtcs = Array.isArray(payload.dtcCodes) ? payload.dtcCodes : [];
    
    // Cap DTC array length (max 20) and sanitize individual DTC codes
    const dtcCodes = rawDtcs
      .slice(0, 20)
      .map(c => String(c).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10))
      .filter(Boolean);

    // Sanitize string inputs to prevent prompt injection attacks
    const sanitizeStr = (str?: string) => String(str || "").replace(/[\r\n"'{}[\]]/g, "").slice(0, 50);
    const cleanMake = sanitizeStr(payload.vehicleMake) || "Motorcycle/Car";
    const cleanModel = sanitizeStr(payload.vehicleModel);
    const cleanYear = Math.max(1900, Math.min(2100, Number(payload.vehicleYear) || 0)) || "";

    const prompt = `You are MotoCortex AI Mechanic. Analyze vehicle diagnostic data and output strict JSON in language code '${lang}'.
Vehicle: ${cleanYear} ${cleanMake} ${cleanModel}
DTC Codes: ${dtcCodes.join(', ')}
Voltage: ${Number(payload.engineVoltage) || 'N/A'}V, Coolant Temp: ${Number(payload.coolantTemp) || 'N/A'}°C
Freeze Frame: ${JSON.stringify(payload.freezeFrameData || {}).slice(0, 500)}

Return JSON structure:
{
  "title": "Short title",
  "summary": "2 sentence diagnostic summary",
  "causes": ["cause 1", "cause 2"],
  "recommendedSteps": ["step 1", "step 2"],
  "estimatedCostRange": "$50 - $150",
  "canDriveSafetyText": "Advice on whether driving to repair shop is safe"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Gemini API Gateway Error: ${errText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return new Response(
        JSON.stringify({ error: "Empty response from Gemini model" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const parsedData = JSON.parse(textResponse);
    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
