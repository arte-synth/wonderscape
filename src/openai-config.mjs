import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
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

export const NpcDescriptionSchema = zodResponseFormat(z.object({
  personality_traits: z.array(z.string()),
  background: z.array(z.string()),
  motivations: z.array(z.string()),
  physical_appearance: z.array(z.string()),
  quirks_mannerisms: z.array(z.string())
}), 'npc_description');