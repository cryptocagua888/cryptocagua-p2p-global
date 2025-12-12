import { GoogleGenAI } from "@google/genai";

// Helper to get safe client
const getClient = () => {
  let apiKey: string | undefined;
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      apiKey = process.env.API_KEY;
    }
  } catch(e) {
    console.warn("Process env not available");
  }

  if (!apiKey) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDescription = async (title: string, category: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Por favor configura tu API KEY para usar la IA.";

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
    return "Error al conectar con la IA.";
  }
};

export const analyzeOffer = async (offerDetails: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "IA no disponible.";

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
    return "Error al analizar.";
  }
};