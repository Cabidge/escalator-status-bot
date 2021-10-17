import { slashLeaf } from "../../slash-command";
import { adminOnly } from "../../slash-command/guards";
import State from "./shared/state";

export default slashLeaf({
    name: "reset",
    description: "Resets the escalator statuses",
    guards: [adminOnly],
    async execute(interaction) {
        await State.reset();
        await interaction.reply({
            content: "Prompt successfully reset",
            ephemeral: true,
        });
    },
});
