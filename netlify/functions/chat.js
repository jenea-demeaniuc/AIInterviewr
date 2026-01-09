// pages/api/chat.js

export default async function handler(req, res) {
  // CORS (optional but nice)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { messages, stressLevel } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid payload: messages must be an array." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "API Key Missing. Set OPENAI_API_KEY in Vercel Project Settings → Environment Variables."
      });
    }

    // Stress logic (same idea as your Netlify code)
    if (stressLevel && stressLevel > 80 && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "system") {
        lastMsg.content += " The candidate is panicking. Press them harder.";
      }
    }

    // Responses API call (recommended)
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: messages,          // accepts role/content array :contentReference[oaicite:1]{index=1}
        temperature: 0.7,
        max_output_tokens: 1000
      })
    });

    if (!r.ok) {
      const errorText = await r.text();
      return res.status(r.status).json({ error: `OpenAI API Error: ${errorText}` });
    }

    const data = await r.json();

    // IMPORTANT: Return the SAME SHAPE your frontend expects
    const content =
      data.output_text ??
      (data.output?.[0]?.content?.map?.(c => c.text).join("") ?? "");

    return res.status(200).json({
      // keep compatibility with your existing frontend parsing
      choices: [{ message: { content } }],
      // optional: include raw response for debugging
      _raw: data
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Internal Server Error" });
  }
}
