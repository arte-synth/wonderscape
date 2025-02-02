import { openAIClient, ImageResponseSchema, ChatResponseSchema } from './openai-config.mjs';

export class NPCGeneratorApp extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'npc-generator',
            template: 'modules/wonderscape/templates/npc-generator.html',
            title: game.i18n.localize("WONDERSCAPE.Dialog.NPCTitle"),
            width: 600,
            height: 800,
            resizable: true,
            classes: ['scene-generator-window']
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('#generate-npc-button').click(this._onGenerate.bind(this));
        html.find('#create-npc-button').click(this._onCreateNPC.bind(this));
    }

    async _onGenerate(event) {
        event.preventDefault();
        const button = $(event.currentTarget);
        const createNPCButton = this.element.find('#create-npc-button');
        const prompt = this.element.find('#npc-prompt-input').val();
        const apiKey = game.settings.get('wonderscape', 'openai-api-key');
        
        if (!apiKey) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoApiKey"));
            return;
        }
        
        try {
            button.prop('disabled', true);
            createNPCButton.prop('disabled', true);
            
            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.GeneratingNPC"));
            
            const client = openAIClient(apiKey);

            // Generate portrait
            const imageResponse = await client.images.generate({
                model: "dall-e-3",
                prompt: `Portrait of ${prompt}`,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            });

            const validatedImageResponse = ImageResponseSchema.parse(imageResponse);
            this._currentImageData = validatedImageResponse.data[0].b64_json;

            // Generate description
            const descriptionResponse = await client.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "user",
                    content: `Create a detailed NPC description for a character described as: ${prompt}\n\nInclude:\n- Personality traits\n- Background\n- Motivations\n- Physical appearance\n- Notable quirks or mannerisms`
                }],
                temperature: 0.7
            });

            const validatedDescriptionResponse = ChatResponseSchema.parse(descriptionResponse);
            this._currentDescription = validatedDescriptionResponse.choices[0].message.content;

            // Display results
            await this._displayResults(this._currentImageData, this._currentDescription);
            
        } catch (error) {
            console.error('Error generating NPC:', error);
            ui.notifications.error(error.message || game.i18n.localize("WONDERSCAPE.Notifications.GenerateNPCError"));
        } finally {
            button.prop('disabled', false);
        }
    }

    async _displayResults(imageData, description) {
        const img = this.element.find('#generated-npc-image');
        img.attr('src', `data:image/png;base64,${imageData}`);
        img.show();
        
        const descriptionElement = this.element.find('#npc-description');
        descriptionElement.text(description);
        descriptionElement.show();
        
        this.element.find('#create-npc-button').prop('disabled', false);
    }

    async _onCreateNPC(event) {
        event.preventDefault();
        if (!this._currentImageData || !this._currentDescription) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoNPCData"));
            return;
        }

        try {
            const imageBlob = await fetch(`data:image/png;base64,${this._currentImageData}`).then(r => r.blob());
            const file = new File([imageBlob], "npc-portrait.png", { type: "image/png" });
            
            // Create journal entry
            const journalEntry = await JournalEntry.create({
                name: this.element.find('#npc-prompt-input').val() || "Generated NPC",
                img: file,
                content: `<img src="${file}" style="float: right; margin: 0 0 10px 10px; width: 300px;">\n\n${this._currentDescription}`
            });

            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.NPCCreated"));
            
            // Open the journal entry
            journalEntry.sheet.render(true);
            
        } catch (error) {
            console.error('Error creating NPC:', error);
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.CreateNPCError"));
        }
    }
}