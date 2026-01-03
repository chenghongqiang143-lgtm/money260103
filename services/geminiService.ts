
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget, FinancialInsight } from "../types";

// Fix: Upgraded to gemini-3-pro-preview for complex financial reasoning tasks.
export const getFinancialInsights = async (
  transactions: Transaction[],
  budgets: Budget[]
): Promise<FinancialInsight | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const summary = transactions.reduce((acc, t) => {
      if (t.type === 'expense') {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const prompt = `
      根据以下记账数据给出财务分析建议：
      预算设定: ${JSON.stringify(budgets)}
      本月支出明细: ${JSON.stringify(summary)}
      全部交易记录: ${JSON.stringify(transactions.slice(-10))}
      
      请提供一段简短的分析，包括一个核心建议(tip)，一段现状分析(analysis)，和一个具体的行动方案(recommendation)。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tip: { type: Type.STRING },
            analysis: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: ["tip", "analysis", "recommendation"],
        },
      },
    });

    if (response.text) {
      // Fix: Added explicit type casting for JSON.parse to ensure type safety.
      return JSON.parse(response.text.trim()) as FinancialInsight;
    }
    return null;
  } catch (error) {
    console.error("Gemini AI error:", error);
    return null;
  }
};
