import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "placeholder",
    });
  }
  return _client;
}

export async function generateSecurityFix(vulnerability: {
  title: string;
  description: string;
  category: string;
  severity: string;
  filePath?: string | null;
  lineNumber?: number | null;
  codeSnippet?: string | null;
}): Promise<{
  explanation: string;
  risk: string;
  priority: string;
  steps: string[];
  cursorPrompt: string;
  claudePrompt: string;
  codeSuggestion?: string;
}> {
  const systemPrompt = `You are SequrAI, an expert security engineer specializing in web application security for AI-built apps. 
You provide clear, actionable security fixes for developers who may not be security experts.
Always respond with valid JSON.`;

  const userPrompt = `Analyze this security vulnerability and provide a detailed fix:

Title: ${vulnerability.title}
Category: ${vulnerability.category}
Severity: ${vulnerability.severity}
Description: ${vulnerability.description}
${vulnerability.filePath ? `File: ${vulnerability.filePath}` : ""}
${vulnerability.lineNumber ? `Line: ${vulnerability.lineNumber}` : ""}
${vulnerability.codeSnippet ? `Code:\n${vulnerability.codeSnippet}` : ""}

Respond with JSON in this exact format:
{
  "explanation": "Simple explanation a non-security expert can understand",
  "risk": "What could happen if this is not fixed",
  "priority": "immediate|high|medium|low",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "cursorPrompt": "A complete prompt for Cursor AI to fix this vulnerability",
  "claudePrompt": "A complete prompt for Claude Code to fix this vulnerability",
  "codeSuggestion": "Optional code snippet showing the fix (or null)"
}`;

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content);
}
