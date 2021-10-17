import { slashLeaf } from "../../slash-command";
import { adminOnly } from "../../slash-command/guards";
import State from "./shared/state";

export default slashLeaf({
    name: "delete",
    description: "Deletes the created prompt",
    guards: [adminOnly],
    async execute(interaction) {
        if (!State.isActive) {
            await interaction.reply({
                content: "Prompt doesn't exist",
                ephemeral: true,
            });
            return;
        }

        await State.clear();
        await interaction.reply({
            content: "Prompt deleted",
            ephemeral: true,
        });
    },
});
