import { GoogleGenAI } from "@google/genai";

// INTENTO DE DETECCIÓN ROBUSTA DE API KEY
// Busca en todas las variantes comunes de variables de entorno para asegurar compatibilidad con Vercel/Vite/CRA/Next
const getApiKey = () => {
  return process.env.API_KEY || 
         process.env.VITE_API_KEY || 
         process.env.REACT_APP_API_KEY || 
         process.env.NEXT_PUBLIC_API_KEY ||
         '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey: apiKey });

// Helper para verificar estado desde la UI
export const isAiConfigured = () => !!apiKey && apiKey.length > 0;

export const generateDescription = async (title: string, category: string): Promise<string> => {
  if (!apiKey) {
    console.error("API Key no encontrada. Configure VITE_API_KEY en Vercel.");
    return "Error: API Key de IA no configurada en el servidor.";
  }

  try {
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
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No se pudo generar la descripción.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Error al conectar con la IA. Verifique su API Key.";
  }
};

export const analyzeOffer = async (offerDetails: string): Promise<string> => {
  if (!apiKey) {
    console.error("API Key no encontrada. Configure VITE_API_KEY en Vercel.");
    return "Error: API Key de IA no configurada en el servidor.";
  }

  try {
    const prompt = `
      Actúa como un experto en comercio global y seguridad P2P. Analiza esta oferta brevemente:
      "${offerDetails}"
      
      Dame 3 puntos clave:
      1. Nivel de riesgo estimado (Bajo/Medio/Alto).
      2. Recomendación de seguridad para el intercambio.
      3. Una pregunta clave que el comprador debería hacer.
      
      Responde en formato Markdown simple.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No se pudo analizar la oferta.";
  } catch (error) {
    console.error("Error analyzing offer:", error);
    return "Error al conectar con la IA. Intente más tarde.";
  }
};