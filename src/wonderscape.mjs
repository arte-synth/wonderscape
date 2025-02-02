import { SceneGeneratorApp } from './scene-generator.mjs';
import { NPCGeneratorApp } from './npc-generator.mjs';

// Register API key setting
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

// Add Scene Generator button
Hooks.on('renderSceneDirectory', (app, html) => {
    const button = $(`<button class="cc-sidebar-button" type="button">🤖 Generate Scene</button>`);
    button.on("click", () => {
        new SceneGeneratorApp().render(true);
    });
    html.find(".directory-header .action-buttons").append(button);
});

// Add NPC Generator button
Hooks.on('renderJournalDirectory', (app, html) => {
    const button = $(`<button class="cc-sidebar-button" type="button">🤖 Generate NPC</button>`);
    button.on("click", () => {
        new NPCGeneratorApp().render(true);
    });
    html.find(".directory-header .action-buttons").append(button);
}); 