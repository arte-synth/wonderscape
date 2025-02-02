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
  personality_traits: z.string(),
  background: z.string(),
  motivations: z.string(),
  physical_appearance: z.string(),
  quirks_mannerisms: z.string()
}), 'npc_description');