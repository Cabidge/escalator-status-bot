import { GuildChannel, Message } from "discord.js";
import { OptionType, slashLeaf } from "../../slash-command";
import { adminOnly } from "../../slash-command/guards";
import State from "./shared/state";

export default slashLeaf({
    name: "create",
    description:
        "Initializes an interactive message with the escalator statuses",
    options: [
        {
            name: "history",
            description: "Where to record the history of reports",
            type: OptionType.Channel,
            required: false,
        },
    ],
    guards: [adminOnly],
    async execute(interaction) {
        const historyChannel = interaction.options.getChannel("history", false);
        if (
            historyChannel !== null &&
            (!(historyChannel instanceof GuildChannel) ||
                !historyChannel.isText())
        ) {
            await interaction.reply({
                content: "History channel must be a text channel",
                ephemeral: true,
            });
            return;
        }

        if (State.isActive) {
            await interaction.reply({
                content: "Prompt already exists",
                ephemeral: true,
            });
            return;
        }

        const message = (await interaction.reply({
            content: "Creating prompt...",
            fetchReply: true,
        })) as Message;

        State.history = historyChannel ?? undefined;
        await State.bind(message);
    },
});
