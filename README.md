# Wonderscape for Foundry VTT

A Foundry VTT module that leverages OpenAI's DALL-E 3 API to generate scenes for Theater of the Mind.

## Description

Wonderscape is your trusty companion for those moments when your players inevitably derail your carefully planned campaign. While FoundryVTT's automation modules are fantastic for streamlining gameplay, they require proper scenes and tokens to function. Sure, you could drop those tokens onto a plain grey background – but where's the fun in that?

Whether they're starting a bar brawl in that one tavern you didn't prep, or suddenly deciding to explore that totally unimportant alley you mentioned in passing, this tool lets you generate a fitting scene in seconds. No more scrambling through your collection of battlemaps or settling for the void – just describe what you need, and get back to the action with a scene that does justice to your players' unexpected "creativity."

Features:
- Generate custom scene backgrounds using natural language descriptions
- Automatic scene creation with optimized settings
- High-quality 1024x1024 images using DALL-E 3
- Simple and intuitive interface
- Direct integration with Foundry VTT's scene system

## Prerequisites

To use this module, you'll need:
- Foundry VTT (version 10 or higher)
- An OpenAI API key with DALL-E 3 access

## Getting an OpenAI API Key

1. Visit [OpenAI's website](https://platform.openai.com/signup)
2. Create an account or sign in
3. Go to your [API settings](https://platform.openai.com/account/api-keys)
4. Click "Create new secret key"
5. Copy your API key and keep it secure
6. Add funds to your OpenAI account (DALL-E 3 image generation costs approximately $0.040 per image)


## Configuration

1. Go to Module Settings in Foundry VTT
2. Find the Wonderscape settings
3. Enter your OpenAI API key in the designated field. Note: the module is fairly small. You can check out source code to make sure I am not collecting your key for any other purposes.
4. Save your settings

## Usage

Currently, the best results work for theater of mind scenes. You can try to prompt for battlemaps, but OpenAI is not very good at it. I am trying to find a solution for this.

1. You will find a new button in scene controls, named "Generate Scene"
2. Enter a brief description or theme for your scene
3. Click "Generate Scene"
4. Review the generated content
5. Click "Create Scene" to automatically create a new scene with the generated image
6. A new scene settings window will be open, to allow changing default scene name or settings.

The generated scene will be configured with optimal settings:
- 1024x1024 resolution
- Centered view
- No grid by default
- Global illumination enabled
- Appropriate padding and background settings

## Tips for Best Results

- Be specific in your scene descriptions
- Try to specify your setting in prompt: fantasy / cyberpunk / etc
- Consider including details about:
  - Lighting and atmosphere
  - Architecture or natural features
  - Time of day
  - Weather conditions
  - Color schemes
- I tend to add "Ultrarealistic", "Dramatic lighting" and "UE5" to the prompt to get better results

## Support

If you encounter any issues or have questions:
- Create an issue here
- Ping me on Discord: arte_synth

## License

This module is licensed under MIT

## Credits

- Powered by OpenAI's DALL-E 3 API
- Special thanks to the Foundry VTT community
