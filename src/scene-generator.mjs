import { openAIClient, ImageResponseSchema } from './openai-config.mjs';

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

    async _onCreateScene(event) {
        event.preventDefault();
        if (!this._currentImageData) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoImage"));
            return;
        }

        try {
            const imageBlob = await fetch(`data:image/png;base64,${this._currentImageData}`).then(r => r.blob());
            const file = new File([imageBlob], "scene-background.png", { type: "image/png" });
            
            // Get the current world's scenes directory path
            const worldPath = `worlds/${game.world.id}/scenes`;
            
            // Upload to Foundry's server using the world's scenes directory
            const uploadResponse = await FilePicker.upload('data', worldPath, file);
            
            // Fix the path to work in both local and hosted environments
            const imagePath = uploadResponse.path.replace(/^\/https:\/\//, 'https://');
            
            // Create scene
            const scene = await Scene.create({
                name: this.element.find('#prompt-input').val() || "Generated Scene",
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