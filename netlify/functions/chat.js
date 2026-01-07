// ELITE BACKEND ENGINE
// Path: netlify/functions/chat.js

exports.handler = async function(event, context) {
    // 1. Security Gate: Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // 2. Validate Payload
        if (!event.body) throw new Error("Null Payload");
        const { messages, stressLevel } = JSON.parse(event.body);

        // --- API KEY CONFIGURATION ---
        // OPTION A: For Live Netlify Deployment (SECURE)
        const apiKey = process.env.OPENAI_API_KEY;

        // OPTION B: For Quick Testing ONLY (UNSECURE)
        // Uncomment the line below and paste your key inside the quotes. 
        // DELETE IT BEFORE UPLOADING TO GITHUB.
        // const apiKey = "sk-proj-YOUR_ACTUAL_KEY_HERE"; 

        // 3. Check if Key Exists
        if (!apiKey) {
            console.error("CRITICAL: API Key is missing.");
            throw new Error("API Key Missing. Set OPENAI_API_KEY in Netlify or paste it in chat.js for testing.");
        }

        // 4. Advanced Logic: Stress Reaction
        // If candidate is stressed (high stressLevel), AI becomes more aggressive
        if (stressLevel && stressLevel > 80 && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'system') {
                lastMsg.content += " The candidate is panicking. Press them harder.";
            }
        }

        // 5. Connect to OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', 
                messages: messages,
                temperature: 0.7, // Balances creativity and logic
                max_tokens: 1000
            }),
        });

        // 6. Handle OpenAI Errors
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error: ${errorText}`);
        }

        const data = await response.json();

        // 7. Return Successful Response
        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" // Allow frontend to talk to backend
            },
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error("Runtime Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || "Internal Server Error" })
        };
    }
};
