import { Transaction } from "../types";
import Groq from "groq-sdk";

const CHAT_SYSTEM_INSTRUCTION = `You are a helpful financial assistant that analyzes credit card transaction data.
You have access to the user's transaction history and can answer questions about their spending patterns.

When answering questions:
1. Be concise and direct
2. Use specific numbers and percentages when relevant
3. Reference actual merchants and categories from the data
4. Format currency with ₹ symbol
5. Use markdown for better readability

If the user asks something you cannot determine from the data, politely explain what information is available.`;

// Build context from transaction data
const buildTransactionContext = (transactions: Transaction[]): string => {
  if (!transactions || transactions.length === 0) {
    return `
TRANSACTION DATA SUMMARY:
========================
No transactions available to analyze.
`;
  }

  const totalSpend = transactions.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
  const totalCredits = transactions.reduce((acc, t) => t.amount < 0 ? acc + Math.abs(t.amount) : acc, 0);

  // Category breakdown
  const categoryMap = new Map<string, number>();
  transactions.forEach(t => {
    if (t.amount > 0) {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    }
  });
  const categoryBreakdown = totalSpend > 0
    ? Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(0)} (${((amt / totalSpend) * 100).toFixed(1)}%)`)
        .join('\n')
    : 'No spending data available';

  // Merchant breakdown (top 10)
  const merchantMap = new Map<string, number>();
  transactions.forEach(t => {
    if (t.amount > 0) {
      merchantMap.set(t.merchant, (merchantMap.get(t.merchant) || 0) + t.amount);
    }
  });
  const merchantBreakdown = Array.from(merchantMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([merch, amt]) => `${merch}: ₹${amt.toFixed(0)}`)
    .join('\n') || 'No merchant data available';

  // Recurring transactions
  const recurringTx = transactions.filter(t => t.isRecurring);
  const recurringList = recurringTx.length > 0
    ? recurringTx.map(t => `${t.merchant}: ₹${t.amount.toFixed(0)}`).join('\n')
    : 'No recurring transactions detected';

  // Date range
  const dates = transactions.map(t => new Date(t.date).getTime()).filter(d => !isNaN(d));
  const minDate = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString() : 'N/A';
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString() : 'N/A';

  return `
TRANSACTION DATA SUMMARY:
========================
Date Range: ${minDate} to ${maxDate}
Total Transactions: ${transactions.length}
Total Spending: ₹${totalSpend.toFixed(0)}
Total Credits/Payments: ₹${totalCredits.toFixed(0)}

SPENDING BY CATEGORY:
${categoryBreakdown}

TOP MERCHANTS:
${merchantBreakdown}

RECURRING SUBSCRIPTIONS:
${recurringList}

RECENT TRANSACTIONS (Last 20):
${transactions.slice(-20).map(t => `${t.date}: ${t.merchant} - ₹${t.amount} [${t.category}]`).join('\n')}
`;
};

// Call Groq API for chat
const callGroqChat = async (
  userMessage: string,
  transactionContext: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: "system", content: CHAT_SYSTEM_INSTRUCTION },
    { role: "user", content: `Here is my transaction data for context:\n${transactionContext}` },
    { role: "assistant", content: "I've analyzed your transaction data. Feel free to ask me any questions about your spending!" },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: "user", content: userMessage }
  ];

  const chatCompletion = await groq.chat.completions.create({
    messages,
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: false
  });

  return chatCompletion.choices[0]?.message?.content || "I couldn't process your request. Please try again.";
};

export const sendChatMessage = async (
  userMessage: string,
  transactions: Transaction[],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return "⚠️ **API Key Missing**\n\nPlease set `GROQ_API_KEY` in your .env file to enable the chatbot.";
    }

    const context = buildTransactionContext(transactions);
    const response = await callGroqChat(userMessage, context, conversationHistory);

    return response;
  } catch (error) {
    console.error("Chat Error:", error);
    return "❌ **Error**\n\nFailed to process your message. Please try again.";
  }
};

export const SAMPLE_QUESTIONS = [
  "What's my total spending?",
  "Which category do I spend the most on?",
  "What are my recurring subscriptions?",
  "Show me my top 5 merchants",
  "How much did I spend on Food?"
];
