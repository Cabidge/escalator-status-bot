import { OptionType, slashLeaf } from "../slash-command";

export default slashLeaf({
    name: "init",
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
    async execute(interaction) {
        interaction.reply("Pong!");
    },
});
