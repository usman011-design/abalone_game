
import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";
import { coordToKey } from "../utils/hexUtils";

// Fix: Removed unused Type, Move, AxialCoord, and incorrectly sourced DIRECTIONS/keyToCoord imports
export const getGeminiSuggestion = async (state: GameState): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const boardStr = Array.from(state.board.entries())
    .map(([key, val]) => `${key}:${val}`)
    .join("; ");

  const prompt = `
    You are an expert Abalone player. 
    Current Turn: ${state.currentPlayer}
    Score: Black ${state.score.black} - White ${state.score.white}
    Board State (q,r:player): ${boardStr}
    
    Analyze the board and suggest a strategy for ${state.currentPlayer}. 
    Focus on board control, forming solid defensive triangles, and identifying opportunities for a Sumito (push).
    Keep your advice concise and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class board game grandmaster. Your tone is helpful and strategic.",
        temperature: 0.7,
      },
    });

    return response.text || "I'm analyzing the board... Stay focused on your center control.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The spirits of the board are quiet today. Rely on your own wisdom.";
  }
};
