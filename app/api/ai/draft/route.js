import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { chatHistory, persona } = body;

    if (!chatHistory || !persona) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 },
      );
    }

    // 1. Choose the fastest model for chat responses
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // 2. Build the System Prompt explaining how Gemini should act
    const prompt = `You are a real person chatting with a friend in a messaging app. Your current personality/tone is: ${persona.toUpperCase()}.
    
    Rules: 
    -Write exactly One short, natural reply.
    -DO NOT wrap your response in quotes.
    -DO NOT include prefixes like "Me:" or "Response:".
    -Keep it brief, conversational, and human-like.
    
    Here is the recent conversation history for context:
      ${chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}
      
      Write your reply now:`;

    // 3. Ask Gemini for the response
    const result = await model.generateContent(prompt);
    let draftText = result.response.text();

    // Clean up any accidental quotes or whitespace Gemini might add
    draftText = draftText.replace(/^["']|["']$/g, "").trim();

    return NextResponse.json({ success: true, draft: draftText });
  } catch (error) {
    console.error("AI Draft Error:", error);
    return NextResponse.json(
      { error: "Failed to generate darft" },
      { status: 500 },
    );
  }
}
