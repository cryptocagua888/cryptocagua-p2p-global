
import { GoogleGenAI } from "@google/genai";

export const isAiConfigured = () => !!process.env.API_KEY;

export const generateDescription = async (title: string, category: string): Promise<string> => {
  try {
    // Re-initialize for each request to capture updated environment state if necessary
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Escribe una descripción profesional, atractiva y concisa para una oferta de intercambio P2P.
      Título: ${title}
      Categoría: ${category}
      
      La descripción debe:
      1. Generar confianza.
      2. Ser clara sobre lo que se ofrece.
      3. No exceder 50 palabras.
      4. Estar en español.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No se pudo generar la descripción.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Error al conectar con la IA. Verifique la configuración.";
  }
};

export const analyzeOffer = async (offerDetails: string): Promise<string> => {
  try {
    // Re-initialize for each request to capture updated environment state if necessary
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Actúa como un experto en comercio global y seguridad P2P. Analiza esta oferta brevemente:
      "${offerDetails}"
      
      Dame 3 puntos clave:
      1. Nivel de riesgo estimado (Bajo/Medio/Alto).
      2. Recomendación de seguridad para el intercambio.
      3. Una pregunta clave que el comprador debería hacer.
      
      Responde en formato Markdown simple con emojis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No se pudo analizar la oferta.";
  } catch (error) {
    console.error("Error analyzing offer:", error);
    return "Error al conectar con la IA. Intente más tarde.";
  }
};
