import { KPIStats, Transaction } from "../types";
import Groq from "groq-sdk";

const SYSTEM_INSTRUCTION = `You are a savvy financial analyst. Your goal is to provide a brief, high-impact "Financial Story" based on credit card data.
Focus on 3 things:
1. Spending Velocity (Are they accelerating spend?).
2. Anomaly Detection (Any weird large purchases?).
3. One actionable tip to save money based on their top category.
Keep the tone professional but conversational. Limit response to 150 words. Format with Markdown.`;

// Build prompt data helper
const buildPromptData = (stats: KPIStats, topTransactions: Transaction[]): string => {
  return `
    Total Spend: $${stats.totalSpend.toFixed(2)}
    Daily Burn Rate: $${stats.burnRate.toFixed(2)}
    Top Category: ${stats.topCategory.name} (${stats.topCategory.percentage.toFixed(1)}%)
    Largest Transaction: ${stats.largestTx.merchant} for $${stats.largestTx.amount}

    Recent Large Transactions:
    ${topTransactions.map(t => `- ${t.date}: ${t.merchant} ($${t.amount}) [${t.category}]`).join('\n')}
  `;
};

// Groq API call using llama-3.3-70b-versatile
const callGroq = async (promptData: string): Promise<string> => {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: `Analyze these spending metrics:\n${promptData}` }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_completion_tokens: 512,
    top_p: 1,
    stream: false
  });

  return chatCompletion.choices[0]?.message?.content || "";
};

export const analyzeSpending = async (
  stats: KPIStats,
  topTransactions: Transaction[]
): Promise<string> => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return "## API Key Missing\nPlease provide `GROQ_API_KEY` in your environment variables to generate AI insights.";
    }

    const promptData = buildPromptData(stats, topTransactions);

    console.log("Calling Groq API (llama-3.3-70b-versatile)...");
    const result = await callGroq(promptData);

    if (result) return result;

    return "## Analysis Failed\nNo response from AI service. Please try again.";

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "## Analysis Failed\nUnable to generate insights due to an API error. Please try again later.";
  }
};
