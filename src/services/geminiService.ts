import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateMenuItemImage(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: `Generate a high-quality, professional food photography image of: ${prompt}. The image should be appetizing, well-lit, and suitable for a cafe menu.` }] }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

export async function analyzeMenuImage(base64Image: string, mimeType: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Extract all menu items, categories, and prices from this image. Format the output as a clean list.' },
            { inlineData: { data: base64Image, mimeType: mimeType } }
          ]
        }
      ]
    });
    return response.text || '';
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
}

export async function getBusinessInsights(query: string, salesData: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `You are an expert restaurant business analyst. Analyze the following sales data and answer the user's query in Arabic.\n\nSales Data:\n${salesData}\n\nQuery: ${query}` }
          ]
        }
      ]
    });
    return response.text || '';
  } catch (error) {
    console.error("Error getting insights:", error);
    throw error;
  }
}
