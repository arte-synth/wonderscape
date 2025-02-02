import OpenAI from 'openai';
import { z } from 'zod';

export const openAIClient = (apiKey) => new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

export const ImageResponseSchema = z.object({
  data: z.array(z.object({
    b64_json: z.string()
  }))
});

export const ChatResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string()
    })
  }))
}); 