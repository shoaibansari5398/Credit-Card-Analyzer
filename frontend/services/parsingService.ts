import { Transaction } from "../types";

export const parseStatementFile = async (file: File, password?: string): Promise<Transaction[]> => {
  const formData = new FormData();
  formData.append("file", file);
  if (password) {
    formData.append("password", password);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

  try {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiBaseUrl}/analyze`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = response.statusText;

        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch (e) {
            // If JSON parse fails, use the raw text (might be HTML or plain text)
            // But limit length to avoid huge HTML dumps
            errorMessage = errorText.substring(0, 200) || errorMessage;
        }

        console.error("API Error Response:", errorMessage);
        throw new Error(errorMessage || `Server Error: ${response.status}`);
    }

    const rawData = await response.json();

    // Validate array response
    if (!Array.isArray(rawData)) {
      throw new Error('Invalid response format: expected an array');
    }

    return rawData
      .filter((item: any) =>
        // Only include items with valid required fields BEFORE applying defaults
        item &&
        (item.date || item.merchant) &&
        item.amount !== undefined &&
        !isNaN(Number(item.amount))
      )
      .map((item: any, index: number) => ({
        id: `parsed-tx-${index}-${Date.now()}`,
        date: item.date || new Date().toISOString(),
        merchant: item.merchant || 'Unknown',
        amount: Number(item.amount) || 0,
        category: item.category || 'Uncategorized',
        isRecurring: !!item.isRecurring
      }));

  } catch (error: any) {
    console.error("Backend Analysis Error:", error);
    // Propagate specific errors like "Incorrect Password" to the UI
    if (error.message.includes("Password") || error.message.includes("password")) {
        throw new Error(error.message);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
