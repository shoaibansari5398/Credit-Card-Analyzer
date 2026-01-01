import { Transaction } from "../types";

export const parseStatementFile = async (file: File, password?: string): Promise<Transaction[]> => {
  const formData = new FormData();
  formData.append("file", file);
  if (password) {
    formData.append("password", password);
  }

  try {
    const response = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Server Error: ${response.status}`);
    }

    const rawData = await response.json();

    if (!Array.isArray(rawData)) {
        console.warn("Parsed data is not an array:", rawData);
        return [];
    }

    return rawData.map((item: any, index: number) => ({
      id: `parsed-tx-${index}-${Date.now()}`,
      date: item.date,
      merchant: item.merchant,
      amount: Number(item.amount),
      category: item.category,
      isRecurring: !!item.isRecurring
    }));

  } catch (error: any) {
    console.error("Backend Analysis Error:", error);
    // Propagate specific errors like "Incorrect Password" to the UI
    if (error.message.includes("Password") || error.message.includes("password")) {
        throw new Error(error.message);
    }
    throw error;
  }
};
