export async function handler(event) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "OPENAI_API_KEY missing" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const wantTTS = !!body.wantTTS;

    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
      }),
    });

    const data = await chatRes.json().catch(() => ({}));

    if (!chatRes.ok) {
      return {
        statusCode: chatRes.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    if (wantTTS) {
      const replyText = data?.choices?.[0]?.message?.content || "";
      const ttsText = replyText.slice(0, 800).trim();

      if (ttsText) {
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            voice: "alloy",
            format: "mp3",
            input: ttsText,
          }),
        });

        if (ttsRes.ok) {
          const buf = Buffer.from(await ttsRes.arrayBuffer());
          data.audio = buf.toString("base64");
        } else {
          data.audio = null;
          data.audio_error = `TTS_FAILED:${ttsRes.status}`;
        }
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Function crashed",
        details: String(e?.message || e),
      }),
    };
  }
}
