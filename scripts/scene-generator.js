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

class SceneGeneratorApp extends Application {
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
            
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json"
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || game.i18n.localize("WONDERSCAPE.Notifications.GenerateError"));
            }

            const data = await response.json();
            const imageData = data.data[0].b64_json;
            
            // Store the base64 data for later use
            this._currentImageData = imageData;
            
            // Display the image
            await this._displayImage(imageData);
            
        } catch (error) {
            console.error('Error generating image:', error);
            ui.notifications.error(error.message || game.i18n.localize("WONDERSCAPE.Notifications.GenerateError"));
        } finally {
            button.prop('disabled', false);
        }
    }

    async _displayImage(base64Data) {
        try {
            const imageUrl = `data:image/png;base64,${base64Data}`;
            
            const imageContainer = this.element.find('#image-container');
            const generatedImage = this.element.find('#generated-image');
            const createSceneButton = this.element.find('#create-scene-button');
            
            generatedImage.attr('src', imageUrl);
            imageContainer.show();
            createSceneButton.prop('disabled', false);
            
        } catch (error) {
            console.error('Error displaying image:', error);
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.DisplayError"));
        }
    }

    async _onCreateScene(event) {
        event.preventDefault();
        
        try {
            // Convert base64 to blob
            const response = await fetch(`data:image/png;base64,${this._currentImageData}`);
            const blob = await response.blob();
            
            // Create a File object from the blob
            const imageFile = new File([blob], `generated-scene-${Date.now()}.png`, { type: 'image/png' });
            
            // Get the current world's scenes directory path
            const worldPath = `worlds/${game.world.id}/scenes`;
            
            // Upload to Foundry's server using the world's scenes directory
            const uploadResponse = await FilePicker.upload('data', worldPath, imageFile);
            
            // Create new scene using the uploaded file path
            const scene = await Scene.create({
                name: game.i18n.localize("WONDERSCAPE.Scenes.DefaultName"),
                img: uploadResponse.path.startsWith('/') ? uploadResponse.path : '/' + uploadResponse.path,
                width: 1024,
                height: 1024,
                backgroundColor: "#000000",
                padding: 0.25,
                initial: {
                    x: null,      // null values will center the view
                    y: null,
                    scale: 1
                },
                // Center the scene in viewport
                viewPosition: {
                    x: 512,      // half of width
                    y: 512,      // half of height
                    scale: 1
                },
                background: {
                    src: uploadResponse.path.startsWith('/') ? uploadResponse.path : '/' + uploadResponse.path,
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

            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.CreateSuccess"));
            
            this.close();
            scene.sheet.render(true);
            
        } catch (error) {
            console.error('Error creating scene:', error);
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.CreateError"));
        }
    }
}

Hooks.on('renderSceneDirectory', (entries, html) => {
    const button = $(`<button class="cc-sidebar-button" type="button">🤖 Generate Scene</button>`);
    button.on("click", () => {
        new SceneGeneratorApp().render(true);
    });
    html.find(".directory-header .action-buttons").append(button);
}); 