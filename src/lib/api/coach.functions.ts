import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PlayerSummary = z.object({
  name: z.string(),
  money: z.number(),
  properties: z.array(z.string()),
  colorGroups: z.array(z.string()),
  inJail: z.boolean(),
  isYou: z.boolean(),
});

const Input = z.object({
  you: PlayerSummary,
  rivals: z.array(PlayerSummary),
  phase: z.enum(["rolling", "moved", "ended"]),
  currentSpace: z.object({
    name: z.string(),
    type: z.string(),
    price: z.number().nullable(),
    owned: z.boolean(),
    rentIfLanded: z.number().nullable(),
    ownerName: z.string().nullable(),
  }),
  turnCount: z.number(),
});

export const getCoachAdvice = createServerFn({ method: "POST" })
  .inputValidator(Input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        headline: "Coach unavailable",
        tips: ["The AI coach is not configured on the server."],
      };
    }

    const system = `You are a friendly, sharp Monopoly strategy coach.
Reply ONLY as compact JSON: {"headline": string (max 60 chars), "tips": string[] (2-4 items, each max 120 chars)}.
Be concrete: name properties, mention color-set completion, rent leverage, cash reserves, and jail tactics.
Never invent rules; never mention you are an AI.`;

    const user = JSON.stringify(data);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429) {
        return { headline: "Coach is resting", tips: ["Rate limit reached. Try again in a moment."] };
      }
      if (res.status === 402) {
        return { headline: "Coach out of credits", tips: ["Please add AI credits to your Lovable workspace."] };
      }
      if (!res.ok) {
        return { headline: "Coach hiccup", tips: [`Gateway error ${res.status}. Try again shortly.`] };
      }

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(content) as { headline?: string; tips?: string[] };
        return {
          headline: (parsed.headline ?? "Play smart").slice(0, 80),
          tips: (parsed.tips ?? []).slice(0, 4).map((t) => String(t).slice(0, 160)),
        };
      } catch {
        return { headline: "Coach's note", tips: [content.slice(0, 160)] };
      }
    } catch (err) {
      return {
        headline: "Coach offline",
        tips: [err instanceof Error ? err.message : "Unknown error contacting coach."],
      };
    }
  });
