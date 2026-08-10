// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const REVENUECAT_API_KEY = Deno.env.get("REVENUECAT_SECRET_KEY") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ valid: false, error: "Unauthorized access: Bearer token required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { userId, entitlementId = "pro" } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ valid: false, error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify sub claim in user JWT matches userId payload to prevent IDOR vulnerabilities
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const jwtPayload = JSON.parse(jsonPayload);
        if (jwtPayload.sub && jwtPayload.role === 'authenticated' && jwtPayload.sub !== userId) {
          return new Response(
            JSON.stringify({ valid: false, error: "Forbidden: Requested userId does not match authenticated JWT subject" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    } catch {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid Authorization JWT" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!REVENUECAT_API_KEY) {
      console.warn("[verify-entitlement] REVENUECAT_SECRET_KEY missing in environment.");
      return new Response(
        JSON.stringify({ valid: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: {
        "Authorization": `Bearer ${REVENUECAT_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ valid: false, error: "Failed to query RevenueCat subscriber info" }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const entitlement = data.subscriber?.entitlements?.[entitlementId];
    const isEntitled = entitlement && entitlement.expires_date ? new Date(entitlement.expires_date) > new Date() : false;

    return new Response(
      JSON.stringify({ valid: isEntitled, entitlement }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ valid: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
