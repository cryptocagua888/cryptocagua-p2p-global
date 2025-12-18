
import { GoogleGenAI } from "@google/genai";

export const isAiConfigured = () => {
  return !!process.env.API_KEY && process.env.API_KEY.length > 5;
};

export const generateDescription = async (title: string, category: string): Promise<string> => {
  if (!isAiConfigured()) return "Configuración de IA pendiente.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Redacta una descripción corta (30 palabras) en español para una oferta de "${title}" (${category}). Profesional y vendedora.`,
    });
    return res.text || "Descripción generada con éxito.";
  } catch {
    return "Error al conectar con la IA.";
  }
};

export const analyzeOffer = async (details: string): Promise<string> => {
  if (!isAiConfigured()) return "IA no configurada.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza esta oferta brevemente: 1. Nivel de Riesgo, 2. Consejo de seguridad. Datos: ${details}. Responde en español.`,
    });
    return res.text || "Análisis completado.";
  } catch {
    return "Error en el análisis.";
  }
};
