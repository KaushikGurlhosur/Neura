import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ALLOWED_PERSONAS = [
  "friendly",
  "professional",
  "flirty",
  "cryptic",
  "sarcastic",
  "humorous",
];

export async function POST(request) {
  try {
    // 1. 🔒 SECURITY GUARD: Authenticate Request before processing content
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decodedUser;
    try {
      decodedUser = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // 🟢 ADDED: Extract knowledgeBase and skippedFields sent from the new frontend
    const {
      chatHistory,
      persona,
      knowledgeBase = {},
      skippedFields = [],
    } = body;

    if (
      !Array.isArray(chatHistory) ||
      chatHistory.length === 0 ||
      !ALLOWED_PERSONAS.includes(persona)
    ) {
      return NextResponse.json(
        { error: "Invalid or Missing required data" },
        { status: 400 },
      );
    }

    // 2. 🧠 INIT REASONING ENGINE (Forces Structured JSON Output)
    // const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            status: {
              type: SchemaType.STRING,
              description: 'Must be exactly "success" OR "needs_info"',
            },
            missingField: {
              type: SchemaType.STRING,
              description:
                'If status is needs_info, what personal detail are they asking about? (e.g., "age", "work", "name")',
            },
            reply: {
              type: SchemaType.STRING,
              description:
                "The actual text reply to send. Leave empty if needs_info.",
            },
          },
          required: ["status", "missingField", "reply"],
        },
      },
    });

    const myGender = knowledgeBase.gender || "neutral";
    const myName = knowledgeBase.name || "User";

    // 3. 🛡️ THE MASTER PRIVACY PROMPT
    const prompt = `You are ${myName}, a real person chatting in a messaging app. 
    IMPORTANT: You are the person labeled "Me" in the history. You are drafting the NEXT message that "Me" will send.
    
    YOUR PROFILE:
    - Gender: ${myGender} (If female, text in a distinctly feminine/girly style. If male, text in a distinctly masculine/bro style. If neutral, be standard).
    - Personality/Tone: ${persona.toUpperCase()}.
    - Known Facts: ${JSON.stringify(knowledgeBase)}
    - Forbidden Topics (User Skipped These): ${skippedFields.join(", ")}
    
    CRITICAL RULES: 
    1. ONLY reply to the last message sent by "Friend". NEVER reply to yourself or double-text unnecessarily. If the last message is from "Me", just naturally follow up.
    2. If "Friend" asks a direct personal question (Where do you work? How old are you? What is your name?) check your "Known Facts".
       - If the fact is missing, DO NOT answer. Return status: "needs_info" and identify the missingField.
       - If the fact is in "Forbidden Topics", smoothly change the subject. Return status: "success" and write the pivot reply.
       - If you know the fact, use it to answer naturally. Return status: "success".
    3. Keep replies short, conversational, and human-like.
    
    Here is the recent conversation history for context:
    ${chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}
      
    Analyze and generate JSON response now:`;

    // 4. 🩺 STABILITY GUARD: Race the Gemini generation against a 5-second timeout
    let timeoutId;

    try {
      const timeoutPromise = new Promise(
        (_, reject) =>
          (timeoutId = setTimeout(
            () => reject(new Error("AI generation deadline exceeded")),
            5000,
          )),
      );

      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise,
      ]);

      // 5. 🟢 PARSE AND RETURN THE JSON DECISION
      const jsonResponse = JSON.parse(result.response.text());

      // Normalize response so it never breaks frontend input.trim()
      jsonResponse.reply = jsonResponse.reply || "";
      jsonResponse.missingField = jsonResponse.missingField || "";

      // This perfectly matches what the frontend is expecting: data.decision.status!
      return NextResponse.json({ success: true, decision: jsonResponse });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("AI Draft Error:", error);
    console.error("AI Draft Route Failure:", error);

    if (error.message === "AI generation deadline exceeded") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
