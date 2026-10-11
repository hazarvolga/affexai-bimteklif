import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openaiProvider';
import { AIProviderRouter } from './providerRouter';

export interface TextProvider {
  isConfigured(): boolean;
  generateText(prompt: string, json?: boolean): Promise<string>;
}

export function createTextProvider(env: NodeJS.ProcessEnv = process.env): TextProvider {
  return new AIProviderRouter([
    new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL),
    new GeminiProvider(env.GEMINI_API_KEY || ''),
  ]);
}
