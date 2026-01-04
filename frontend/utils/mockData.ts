import { Transaction } from "../types";
import { TRANSACTION_CATEGORIES } from "../config/constants";

const MERCHANTS: Record<string, string[]> = {
  Food: ['Uber Eats', 'Swiggy', 'Zomato', 'Starbucks', 'Local Grocer', 'Whole Foods'],
  Transport: ['Uber', 'Lyft', 'Shell Station', 'Metro Pass', 'Parking'],
  Shopping: ['Amazon', 'Target', 'Nike', 'Apple Store', 'Zara'],
  Utilities: ['Comcast', 'Electric Co', 'Water Dept', 'AT&T'],
  Entertainment: ['Netflix', 'Spotify', 'Cinema City', 'Steam Games'],
  Health: ['CVS Pharmacy', 'Doctor Visit', 'Gym Membership'],
  Travel: ['Delta Airlines', 'Airbnb', 'Hotel Inn', 'Expedia']
};

// Filter out 'Other' and categories without merchant mappings for mock data generation
const CATEGORIES = TRANSACTION_CATEGORIES.filter(c => c !== 'Other' && c in MERCHANTS);

export const generateMockData = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Generate for the last 30 days
  for (let i = 0; i < 60; i++) { // 60 transactions
    const date = new Date(currentYear, currentMonth, today.getDate() - Math.floor(Math.random() * 30));
    const catIndex = Math.floor(Math.random() * CATEGORIES.length);
    const category = CATEGORIES[catIndex];
    const merchantList = MERCHANTS[category];
    const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];

    // Weighted random amount
    let amount = Math.floor(Math.random() * 100) + 5;
    if (category === 'Travel' || category === 'Shopping') {
      if (Math.random() > 0.8) amount += 400; // Occasional large purchase
    }

    // Simulate recurring
    const isRecurring = (merchant === 'Netflix' || merchant === 'Spotify' || merchant === 'Gym Membership');

    transactions.push({
      id: `tx-${i}`,
      date: date.toISOString().split('T')[0],
      merchant,
      amount,
      category,
      isRecurring
    });
  }

  // Inject a "Whale"
  transactions.push({
    id: 'tx-whale',
    date: new Date(currentYear, currentMonth, today.getDate() - 5).toISOString().split('T')[0],
    merchant: 'Apple Store',
    amount: 1299.00,
    category: 'Shopping',
    isRecurring: false
  });

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
