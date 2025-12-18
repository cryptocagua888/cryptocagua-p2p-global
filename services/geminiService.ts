
import { GoogleGenAI } from "@google/genai";

export const isAiConfigured = () => {
  const key = process.env.API_KEY;
  return typeof key === 'string' && key.length > 5;
};

export const generateDescription = async (title: string, category: string): Promise<string> => {
  if (!isAiConfigured()) return "La IA no detecta la API Key. Por favor, revisa la configuración del entorno.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escribe una descripción corta (máximo 40 palabras) en español para una oferta P2P de: ${title} en la categoría ${category}. Que sea profesional.`,
    });
    return response.text || "Descripción generada.";
  } catch (error) {
    return "Error al conectar con Gemini.";
  }
};

export const analyzeOffer = async (offerDetails: string): Promise<string> => {
  if (!isAiConfigured()) return "Configuración de IA no detectada.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza esta oferta P2P y dime: 1. Riesgo (Bajo/Medio/Alto), 2. Un consejo de seguridad, 3. Una pregunta para el vendedor. Detalles: ${offerDetails}. Responde en español con emojis.`,
    });
    return response.text || "Análisis completado.";
  } catch (error) {
    return "Error en el análisis de IA.";
  }
};
