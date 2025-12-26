import { KPIStats, Transaction } from "../types";

const SYSTEM_INSTRUCTION = `You are a savvy financial analyst. Your goal is to provide a brief, high-impact "Financial Story" based on credit card data.
Focus on 3 things:
1. Spending Velocity (Are they accelerating spend?).
2. Anomaly Detection (Any weird large purchases?).
3. One actionable tip to save money based on their top category.
Keep the tone professional but conversational. Limit response to 150 words. Format with Markdown.`;

export const analyzeSpending = async (
  stats: KPIStats,
  topTransactions: Transaction[]
): Promise<string> => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return "## API Key Missing\nPlease provide a valid OpenRouter API Key in the environment to generate insights.";
    }

    // Construct a lean prompt to save tokens
    const promptData = `
      Total Spend: $${stats.totalSpend.toFixed(2)}
      Daily Burn Rate: $${stats.burnRate.toFixed(2)}
      Top Category: ${stats.topCategory.name} (${stats.topCategory.percentage.toFixed(1)}%)
      Largest Transaction: ${stats.largestTx.merchant} for $${stats.largestTx.amount}

      Recent Large Transactions:
      ${topTransactions.map(t => `- ${t.date}: ${t.merchant} ($${t.amount}) [${t.category}]`).join('\n')}
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_INSTRUCTION
                },
                {
                    role: "user",
                    content: `Analyze these spending metrics:\n${promptData}`
                }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No insights could be generated at this time.";

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "## Analysis Failed\nUnable to generate insights due to an API error. Please try again later.";
  }
};
