import { slashLeaf } from "../../slash-command";
import { adminOnly } from "../../slash-command/guards";
import AsyncState from "./shared/state";

export default slashLeaf({
    name: "delete",
    description: "Deletes the created prompt",
    guards: [adminOnly],
    async execute(interaction) {
        const State = await AsyncState;

        if (!State.hasPrompt) {
            await interaction.reply({
                content: "Prompt doesn't exist",
                ephemeral: true,
            });
            return;
        }

        await State.deletePrompt();
        await interaction.reply({
            content: "Prompt deleted",
            ephemeral: true,
        });
    },
});
