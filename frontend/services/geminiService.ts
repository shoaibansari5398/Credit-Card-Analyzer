import { KPIStats, Transaction } from "../types";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `You are a savvy financial analyst. Your goal is to provide a brief, high-impact "Financial Story" based on credit card data.
Focus on 3 things:
1. Spending Velocity (Are they accelerating spend?).
2. Anomaly Detection (Any weird large purchases?).
3. One actionable tip to save money based on their top category.
Keep the tone professional but conversational. Limit response to 150 words. Format with Markdown.`;

// Build prompt data helper
const buildPromptData = (stats: KPIStats, topTransactions: Transaction[]): string => {
  return `
    Total Spend: ₹${stats.totalSpend.toFixed(2)}
    Daily Burn Rate: ₹${stats.burnRate.toFixed(2)}
    Top Category: ${stats.topCategory.name} (${stats.topCategory.percentage.toFixed(1)}%)
    Largest Transaction: ${stats.largestTx.merchant} for ₹${stats.largestTx.amount}

    Recent Large Transactions:
    ${topTransactions.map(t => `- ${t.date}: ${t.merchant} (₹${t.amount}) [${t.category}]`).join('\n')}
  `;
};

// Gemini API call
const callGemini = async (promptData: string): Promise<string> => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `${SYSTEM_INSTRUCTION}\n\nAnalyze these spending metrics:\n${promptData}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text() || "";
};

export const analyzeSpending = async (
  stats: KPIStats,
  topTransactions: Transaction[]
): Promise<string> => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "## API Key Missing\nPlease provide `GEMINI_API_KEY` in your environment variables to generate AI insights.";
    }

    const promptData = buildPromptData(stats, topTransactions);

    console.log("Calling Gemini API (gemini-2.0-flash)...");
    const result = await callGemini(promptData);

    if (result) return result;

    return "## Analysis Failed\nNo response from AI service. Please try again.";

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "## Analysis Failed\nUnable to generate insights due to an API error. Please try again later.";
  }
};
