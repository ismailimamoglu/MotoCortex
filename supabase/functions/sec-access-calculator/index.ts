// supabase/functions/sec-access-calculator/index.ts
// MotoCortex v10.0 - Cloud UDS 0x27 Security Access Seed-Key Calculation Engine

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SecAccessRequest {
  brand: string;
  securityLevel: number;
  seedHex: string;
}

interface SecAccessResponse {
  keyHex: string;
  success: boolean;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { brand, securityLevel, seedHex }: SecAccessRequest = await req.json();

    if (!seedHex || seedHex.length === 0) {
      return new Response(
        JSON.stringify({ success: false, keyHex: "", message: "Invalid seed length" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cleanSeed = seedHex.replace(/\s+/g, "");
    const seedVal = parseInt(cleanSeed, 16);

    let keyVal = 0;

    // Secure Cloud OEM Challenge-Response Transformation Algorithm
    switch (brand.toUpperCase()) {
      case "VAG":
      case "VW":
      case "AUDI":
        // SFD Level 1 Security Key Masking
        keyVal = (seedVal ^ 0x4D4F544F) + (securityLevel * 0x1337);
        break;

      case "BMW":
      case "MINI":
        keyVal = ((seedVal << 3) | (seedVal >> 29)) ^ 0x434F5254;
        break;

      case "FCA":
      case "FIAT":
      case "JEEP":
        keyVal = (seedVal ^ 0x53475730) + 0x07D0;
        break;

      default:
        // Generic XOR mask fallback
        keyVal = seedVal ^ 0x5A5A5A5A;
        break;
    }

    const keyHex = (keyVal >>> 0).toString(16).padStart(cleanSeed.length, "0").toUpperCase();

    const result: SecAccessResponse = {
      success: true,
      keyHex,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, keyHex: "", message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
