import { KPIStats, Transaction } from "../types";

// Call backend insights API (proxies to Gemini)
export const analyzeSpending = async (
  stats: KPIStats,
  topTransactions: Transaction[]
): Promise<string> => {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiBaseUrl}/api/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stats,
        topTransactions
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.insights || "## Analysis Failed\nNo response from AI service.";

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "## Analysis Failed\nUnable to generate insights due to an API error. Please try again later.";
  }
};
