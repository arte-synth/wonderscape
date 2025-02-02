import { openAIClient, ImageResponseSchema, ChatResponseSchema } from './openai-config.mjs';

Hooks.once('init', () => {
    game.settings.register('wonderscape', 'openai-api-key', {
        name: game.i18n.localize("WONDERSCAPE.Settings.ApiKey.Name"),
        hint: game.i18n.localize("WONDERSCAPE.Settings.ApiKey.Hint"),
        scope: 'world',
        config: true,
        type: String,
        default: '',
        restricted: true
    });
});

export class SceneGeneratorApp extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'scene-generator',
            template: 'modules/wonderscape/templates/generator.html',
            title: game.i18n.localize("WONDERSCAPE.Dialog.Title"),
            width: 800,
            height: 700,
            resizable: true,
            classes: ['scene-generator-window']
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('#generate-button').click(this._onGenerate.bind(this));
        html.find('#create-scene-button').click(this._onCreateScene.bind(this));
        html.find('#generate-name-button').click(this._onGenerateName.bind(this));
    }

    async _onGenerate(event) {
        event.preventDefault();
        const button = $(event.currentTarget);
        const createSceneButton = this.element.find('#create-scene-button');
        const prompt = this.element.find('#prompt-input').val();
        const apiKey = game.settings.get('wonderscape', 'openai-api-key');
        
        if (!apiKey) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoApiKey"));
            return;
        }
        
        try {
            button.prop('disabled', true);
            createSceneButton.prop('disabled', true);
            
            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.Generating"));
            
            const client = openAIClient(apiKey);
            const response = await client.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            });

            const validatedResponse = ImageResponseSchema.parse(response);
            this._currentImageData = validatedResponse.data[0].b64_json;
            console.log('Image data received:', this._currentImageData.slice(0, 50) + '...');
            
            await this._displayImage(this._currentImageData);
            
        } catch (error) {
            console.error('Error generating image:', error);
            ui.notifications.error(error.message || game.i18n.localize("WONDERSCAPE.Notifications.GenerateError"));
        } finally {
            button.prop('disabled', false);
        }
    }

    async _displayImage(imageData) {
        const img = this.element.find('#generated-image');
        console.log('Image element:', img);
        
        // Make sure we're setting a complete data URL
        img.attr('src', `data:image/png;base64,${imageData}`);
        
        // Force a reflow
        img.hide().show();
        
        this.element.find('#create-scene-button').prop('disabled', false);
    }

    async _onGenerateName(event) {
        event.preventDefault();
        const button = $(event.currentTarget);
        const nameInput = this.element.find('#scene-name-input');
        const currentName = nameInput.val()?.trim();
        const prompt = this.element.find('#prompt-input').val();
        const apiKey = game.settings.get('wonderscape', 'openai-api-key');
        
        if (!apiKey) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoApiKey"));
            return;
        }
        
        try {
            button.prop('disabled', true);
            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.GeneratingName"));
            
            const client = openAIClient(apiKey);
            const content = prompt?.trim() 
                ? `Analyze this scene description and create a short, evocative name (2-4 words) for its main subject:
                   "${prompt}"
                   
                   Guidelines:
                   1. Identify the main subject (e.g., tower, forest, castle, cave)
                   2. Consider the environment and atmosphere
                   3. Create a name that captures the subject's unique characteristics
                   4. Do not use quotes in the name
                   
                   Example inputs and outputs:
                   "A dark tower rising from misty mountains" -> Shadowspire Peak
                   "An ancient forest with glowing mushrooms" -> Luminous Grove
                   "A bustling marketplace in a desert city" -> Saffron Bazaar`
                : `Create a short, evocative name (2-4 words) for a random fantasy location.${
                    currentName ? `\n\nCurrent name is "${currentName}" - please generate a different name.` : ''}
                   
                   Guidelines:
                   1. Choose an interesting location type
                   2. Consider its atmosphere and unique features
                   3. Do not use quotes in the name
                   ${currentName ? '4. Make sure the new name is different from the current one' : ''}
                   
                   Example outputs:
                   - Whispering Citadel
                   - Stormweave Sanctuary
                   - Crystalline Depths`;
            
            const response = await client.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "user",
                    content
                }],
                temperature: 0.8
            });

            const validatedResponse = ChatResponseSchema.parse(response);
            // Remove any quotes and trim whitespace
            const generatedName = validatedResponse.choices[0].message.content
                .replace(/["']/g, '')  // Remove quotes
                .trim();
            nameInput.val(generatedName);
            
        } catch (error) {
            console.error('Error generating name:', error);
            ui.notifications.error(error.message || game.i18n.localize("WONDERSCAPE.Notifications.GenerateNameError"));
        } finally {
            button.prop('disabled', false);
        }
    }

    async _onCreateScene(event) {
        event.preventDefault();
        if (!this._currentImageData) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoImage"));
            return;
        }

        try {
            // Get or generate scene name
            const sceneName = this.element.find('#scene-name-input').val()?.trim() || 
                `Generated Scene ${foundry.utils.randomID(6)}`;
            
            // Create a safe filename from the scene name
            const safeFilename = sceneName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric chars with hyphens
                .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
                .substring(0, 50);            // Limit length
            
            const filename = `${safeFilename}-${foundry.utils.randomID(4)}.png`;
            
            const imageBlob = await fetch(`data:image/png;base64,${this._currentImageData}`).then(r => r.blob());
            const file = new File([imageBlob], filename, { type: "image/png" });
            
            // Get the current world's scenes directory path
            const worldPath = `worlds/${game.world.id}/scenes`;
            
            // Upload to Foundry's server using the world's scenes directory
            const uploadResponse = await FilePicker.upload('data', worldPath, file);
            
            // Fix the path to work in both local and hosted environments
            const imagePath = uploadResponse.path.replace(/^\/https:\/\//, 'https://');
            
            // Create scene
            const scene = await Scene.create({
                name: sceneName,
                img: imagePath,
                width: 1024,
                height: 1024,
                backgroundColor: "#000000",
                padding: 0.25,
                initial: {
                    x: null,
                    y: null,
                    scale: 1
                },
                viewPosition: {
                    x: 512,
                    y: 512,
                    scale: 1
                },
                background: {
                    src: imagePath,
                    tint: null
                },
                grid: {
                    type: 0,
                    size: 100,
                    visible: false
                },
                globalLight: true,
                globalLightThreshold: 1.0,
                darkness: 0
            });

            // Upload the image
            await scene.createThumbnail();
            
            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.SceneCreated"));
            
            // Render the scene config sheet
            scene.sheet.render(true);
            
        } catch (error) {
            console.error('Error creating scene:', error);
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.CreateError"));
        }
    }
}