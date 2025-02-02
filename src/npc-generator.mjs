import { openAIClient, ImageResponseSchema, ChatResponseSchema, NpcDescriptionSchema } from './openai-config.mjs';

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
        html.find('#generate-npc-name-button').click(this._onGenerateName.bind(this));
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
            
            const client = openAIClient(apiKey);

            // Start both generations in parallel
            const portraitPromise = this._generatePortrait(client, prompt);
            const descriptionPromise = this._generateDescription(client, prompt);
            
            // Handle results as they come in
            portraitPromise.then(imageData => {
                this._currentImageData = imageData;
                this._displayPortrait(imageData);
            }).catch(error => {
                console.error('Error generating portrait:', error);
                ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.GenerateNPCPortraitError"));
            });
            
            descriptionPromise.then(description => {
                this._currentDescription = description;
                this._displayDescription(description);
            }).catch(error => {
                console.error('Error generating description:', error);
                ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.GenerateNPCDescriptionError"));
            });
            
            // Enable create button when both are done
            Promise.all([portraitPromise, descriptionPromise])
                .then(() => {
                    createNPCButton.prop('disabled', false);
                })
                .finally(() => {
                    button.prop('disabled', false);
                });
            
        } catch (error) {
            console.error('Error starting generation:', error);
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.GenerateNPCError"));
            button.prop('disabled', false);
        }
    }

    async _generatePortrait(client, prompt) {
        ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.GeneratingNPCPortrait"));
        
        const imageResponse = await client.images.generate({
            model: "dall-e-3",
            prompt: `Portrait of ${prompt}. No text must present in the image.`,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
        });

        const validatedImageResponse = ImageResponseSchema.parse(imageResponse);
        return validatedImageResponse.data[0].b64_json;
    }

    async _generateDescription(client, prompt) {
        ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.GeneratingNPCDescription"));
        
        const npcName = this.element.find('#npc-name-input').val()?.trim();
        const descriptionResponse = await client.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [{
                role: "user",
                content: `Create a detailed NPC description for ${npcName ? `${npcName}, who is ` : 'a character '}described as: ${prompt}

                For each category below, provide 3-4 concise bullet points:
                1. Personality traits - key aspects of their character
                2. Background - important events or facts from their past
                3. Motivations - what drives them and their goals
                4. Physical appearance - distinctive visual features
                5. Notable quirks and mannerisms - unique behaviors or habits

                ${npcName ? 'Note: Use their name naturally throughout each section.' : ''}`
            }],
            response_format: NpcDescriptionSchema
        });

        const description = descriptionResponse.choices[0].message.parsed;
        
        // Format the description with headers
        return description;
    }

    _displayPortrait(imageData) {
        const img = this.element.find('#generated-npc-image');
        const portraitContainer = this.element.find('.portrait-container');
        
        img.attr('src', `data:image/png;base64,${imageData}`);
        portraitContainer.show();
    }

    _displayDescription(description) {
        const personalityTraits = this.element.find('#npc-personality-traits');
        const background = this.element.find('#npc-background');
        const motivations = this.element.find('#npc-motivations');
        const physicalAppearance = this.element.find('#npc-physical-appearance');
        const quirksAndMannerisms = this.element.find('#npc-quirks-and-mannerisms');

        const personalityTraitsText = this.element.find('#npc-personality-traits-text');
        const backgroundText = this.element.find('#npc-background-text');
        const motivationsText = this.element.find('#npc-motivations-text');
        const physicalAppearanceText = this.element.find('#npc-physical-appearance-text');
        const quirksAndMannerismsText = this.element.find('#npc-quirks-and-mannerisms-text');

        // Set bullet points for each section
        personalityTraitsText.html(this._formatBulletPoints(description.personality_traits));
        backgroundText.html(this._formatBulletPoints(description.background));
        motivationsText.html(this._formatBulletPoints(description.motivations));
        physicalAppearanceText.html(this._formatBulletPoints(description.physical_appearance));
        quirksAndMannerismsText.html(this._formatBulletPoints(description.quirks_mannerisms));

        // Show elements
        personalityTraits.show();
        background.show();
        motivations.show();
        physicalAppearance.show();
        quirksAndMannerisms.show();
    }

    _formatBulletPoints(points) {
        return `<ul>${points.map(point => `<li>${point}</li>`).join('')}</ul>`;
    }

    async _onGenerateName(event) {
        event.preventDefault();
        const button = $(event.currentTarget);
        const nameInput = this.element.find('#npc-name-input');
        const currentName = nameInput.val()?.trim();
        const prompt = this.element.find('#npc-prompt-input').val();
        const apiKey = game.settings.get('wonderscape', 'openai-api-key');
        
        if (!apiKey) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoApiKey"));
            return;
        }
        
        try {
            button.prop('disabled', true);
            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.GeneratingNPCName"));
            
            const client = openAIClient(apiKey);
            const content = prompt?.trim() 
                ? `Analyze this NPC description and create a fitting name for the character:
                   "${prompt}"
                   
                   Guidelines:
                   1. Consider the character's role, personality, and background
                   2. Match the name to their cultural context if provided
                   3. Create a name that reflects their notable characteristics
                   4. Include a title or epithet if appropriate
                   5. Do not use quotes in the name
                   
                   Example inputs and outputs:
                   "A wise old wizard who lives in a crystal tower" -> Aldrich the Crystalline Sage
                   "A fierce orc warrior with ritual scars" -> Grokmar Scarfist
                   "A mysterious elven merchant who never ages" -> Sylindria the Timeless`
                : `Create a single name for a random fantasy NPC.${
                    currentName ? `\n\nCurrent name is "${currentName}" - please generate a different name.` : ''}
                   
                   Guidelines:
                   1. Include both name and title/epithet
                   2. Consider their potential role or profession
                   3. Do not use quotes in the name
                   4. Return only one name, not a list
                   ${currentName ? '4. Make sure the new name is different from the current one' : ''}
                   
                   Example output: Theron the Wandering Sage`;
            
            const response = await client.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "user",
                    content
                }],
                temperature: 0.8
            });

            const validatedResponse = ChatResponseSchema.parse(response);
            const generatedName = validatedResponse.choices[0].message.content
                .replace(/["']/g, '')  // Remove quotes
                .replace(/^[-•*]\s*/, '')  // Remove any list markers
                .trim();
            nameInput.val(generatedName);
            
        } catch (error) {
            console.error('Error generating name:', error);
            ui.notifications.error(error.message || game.i18n.localize("WONDERSCAPE.Notifications.GenerateNPCNameError"));
        } finally {
            button.prop('disabled', false);
        }
    }

    async _onCreateNPC(event) {
        event.preventDefault();
        if (!this._currentImageData || !this._currentDescription) {
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.NoNPCData"));
            return;
        }

        try {
            const imageBlob = await fetch(`data:image/png;base64,${this._currentImageData}`).then(r => r.blob());
            const npcName = this.element.find('#npc-name-input').val()?.trim() || 
                `Generated NPC ${foundry.utils.randomID(6)}`;
            
            // Create a safe filename from the NPC name
            const safeFilename = npcName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 50);
            
            const filename = `${safeFilename}-${foundry.utils.randomID(4)}.png`;
            const file = new File([imageBlob], filename, { type: "image/png" });
            
            // Get the current world's assets directory path
            const worldPath = `worlds/${game.world.id}/assets`;
            
            // Upload to Foundry's server
            const uploadResponse = await FilePicker.upload('data', worldPath, file);
            
            // Fix the path to work in both local and hosted environments
            const imagePath = uploadResponse.path.replace(/^\/https:\/\//, 'https://');
            
            // Create journal entry with proper page structure
            const journalEntry = await JournalEntry.create({
                name: npcName,
                pages: [{
                    name: "Bio",
                    type: "text",
                    title: {
                        show: true,
                        level: 1
                    },
                    text: {
                        content: `
                        <img src="${imagePath}" style="display: block; margin: 0 auto 20px auto; max-width: 400px;" />
                        <div id="npc-personality-traits">
                            <h3>${game.i18n.localize("WONDERSCAPE.Dialog.NPCPersonalityTraits")}</h3>
                            ${this._formatBulletPoints(this._currentDescription.personality_traits)}
                        </div>
                        <div id="npc-background">
                            <h3>${game.i18n.localize("WONDERSCAPE.Dialog.NPCBackground")}</h3>
                            ${this._formatBulletPoints(this._currentDescription.background)}
                        </div>
                        <div id="npc-motivations">
                            <h3>${game.i18n.localize("WONDERSCAPE.Dialog.NPCMotivations")}</h3>
                            ${this._formatBulletPoints(this._currentDescription.motivations)}
                        </div>
                        <div id="npc-physical-appearance">
                            <h3>${game.i18n.localize("WONDERSCAPE.Dialog.NPCPhysicalAppearance")}</h3>
                            ${this._formatBulletPoints(this._currentDescription.physical_appearance)}
                        </div>
                        <div id="npc-quirks-and-mannerisms">
                            <h3>${game.i18n.localize("WONDERSCAPE.Dialog.NPCQuirksAndMannerisms")}</h3>
                            ${this._formatBulletPoints(this._currentDescription.quirks_mannerisms)}
                        </div>
                        `,
                        format: 1  // FORMAT.HTML = 1
                    }
                }]
            });

            ui.notifications.info(game.i18n.localize("WONDERSCAPE.Notifications.CreateNPCSuccess"));
            
            // Open the journal entry
            journalEntry.sheet.render(true);
            
        } catch (error) {
            console.error('Error creating NPC:', error);
            ui.notifications.error(game.i18n.localize("WONDERSCAPE.Notifications.CreateNPCError"));
        }
    }
}