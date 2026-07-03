import { GoogleGenerativeAI } from "@google/generative-ai";
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
    const { chatHistory, persona } = body;

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

    // 2. Choose the fastest model for chat responses
    // const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    // 3. Build the System Prompt explaining how Gemini should act
    const prompt = `You are a real person chatting in a messaging app. 
    IMPORTANT: You are the person labeled "Me" in the history. You are drafting the NEXT message that "Me" will send.
    
    Your current personality/tone is: ${persona.toUpperCase()}.
    
    Rules: 
    - Write exactly ONE short, natural reply.
    - DO NOT wrap your response in quotes.
    - DO NOT include prefixes like "Me:" or "Response:".
    - Keep it brief, conversational, and human-like.
    - If the last message in the history is from "Me", write a natural follow-up or double-text. 
    - If the last message is from "Friend", reply to what they just said.
    
    Here is the recent conversation history for context:
    ${chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}
      
    Write your next message now:`;

    // 5. 🩺 STABILITY GUARD: Race the Gemini generation against a 5-second timeout

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

      let draftText = result.response.text();

      // Clean up any accidental quotes or whitespace Gemini might add
      draftText = draftText.replace(/^["']|["']$/g, "").trim();

      return NextResponse.json({ success: true, draft: draftText });
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
