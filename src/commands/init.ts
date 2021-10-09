import { GuildChannel, MessageActionRow, MessageSelectMenu } from "discord.js";
import { OptionType, slashLeaf } from "../slash-command";
import { initStatus, ReportResult } from "./init/status";
import { AsyncTaskQueue } from "./init/async-action-queue";
import { AntiSpam } from "./init/anti-spam";

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
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: "Cannot init outside of a guild",
                ephemeral: true,
            });
            return;
        }

        const historyChannel = interaction.options.getChannel("history", false);
        if (
            historyChannel !== null &&
            (!(historyChannel instanceof GuildChannel) ||
                !historyChannel.isText())
        ) {
            await interaction.reply({
                content: "History channel must be a text channel.",
                ephemeral: true,
            });
            return;
        }

        const status = initStatus();

        const createSelectRow = (
            escalators: [number, number][],
            placeholder: string,
            id: string
        ) =>
            new MessageActionRow().addComponents(
                new MessageSelectMenu()
                    .setPlaceholder(placeholder)
                    .setCustomId(id)
                    .addOptions(
                        escalators.map(([a, b]) => ({
                            label: `${a} to ${b}`,
                            value: `${a}${b}`,
                        }))
                    )
            );

        const createComponents = () => {
            const { woke, broke } = status.splitStatuses;
            const components: MessageActionRow[] = [];
            if (woke.length > 0)
                components.push(
                    createSelectRow(woke, "Escalator machine broke", "report")
                );
            if (broke.length > 0)
                components.push(
                    createSelectRow(
                        broke,
                        "Escalator has been revived",
                        "resolve"
                    )
                );
            return components;
        };

        await interaction.reply({
            content: status.message,
            components: createComponents(),
        });

        const taskQueue = new AsyncTaskQueue();
        const antiSpam = new AntiSpam(10_000);

        const collector =
            interaction.channel!.createMessageComponentCollector();
        collector.on("collect", (i) => {
            if (!i.isSelectMenu()) return;

            taskQueue.enqueue(async () => {
                const selected = i.values[0];
                const start = parseInt(selected[0]);
                const end = parseInt(selected[1]);

                if (!antiSpam.tryInteract(i.user.id)) {
                    await i.user.send(
                        "Chill out! To prevent spam, you must wait 10 seconds between each report"
                    );
                    return;
                }

                const isBroke = i.customId === "report";

                const result = (isBroke ? status.report : status.resolve)(
                    start,
                    end
                );

                switch (result) {
                    case ReportResult.Success:
                        await i.update({
                            content: status.message,
                            components: createComponents(),
                        });
                        if (historyChannel) {
                            //TODO
                            //historyChannel.send()
                        }
                        break;
                    case ReportResult.Invalid:
                        await i.reply({
                            content: `The ${start} to ${end} doesn't exist, silly`,
                            ephemeral: true,
                        });
                        break;
                    case ReportResult.Redundant:
                        await i.reply({
                            content:
                                "Whoops! It seems like someone already reported this before you.",
                            ephemeral: true,
                        });
                }
            });
        });
    },
});
