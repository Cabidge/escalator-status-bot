import { Client, CommandInteraction, Intents } from "discord.js";
import { commands } from "./commands";
import { onClientReady } from "./commands/prompt/shared/state";
import {
    commandBranches,
    createTree,
    navigateTree,
} from "./slash-command/command-tree.js";

import { TOKEN } from "./token";

export type SlashExecution = (interaction: CommandInteraction) => Promise<void>;

export const client = new Client({
    intents: [Intents.FLAGS.GUILDS],
});

client.once("ready", (c) => {
    console.log(`Ready @ ${Date()}`);
    onClientReady(c);
});

const commandTree = createTree(commands);

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const executeCommand = navigateTree(
        commandTree,
        commandBranches(interaction)
    );
    if (!executeCommand) return;

    try {
        await executeCommand(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.deferred || interaction.replied) return;
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
});

client.login(TOKEN);
