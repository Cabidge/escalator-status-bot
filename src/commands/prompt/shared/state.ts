import {
    CommandInteraction,
    InteractionCollector,
    Message,
    MessageComponentInteraction,
    MessageEmbed,
    NewsChannel,
    TextChannel,
} from "discord.js";
import { createStatusBody, initStatus, ReportResult, Status } from "./status";
import { AsyncTaskQueue } from "./async-action-queue";
import { AntiSpam } from "./anti-spam";

interface EscalatorState {
    readonly status?: Status;
    create(
        interaction: CommandInteraction,
        historyChannel?: TextChannel | NewsChannel
    ): Promise<void>;
    reset(): Promise<void>;
    clear(): Promise<void>;
}

interface PrivateState {
    status: Status;
    promptMessage: Message;
    collector: InteractionCollector<MessageComponentInteraction>;
    history?: TextChannel;
}

let state: PrivateState | undefined;

async function reset() {
    if (state === undefined) return;

    state.status = initStatus();
    const { promptMessage, status, history } = state;

    await promptMessage.edit(createStatusBody(status));

    if (history) {
        const embed = new MessageEmbed()
            .setColor("GREEN")
            .setTitle("All escalator statuses have been reset");

        await history.send({ embeds: [embed] });
    }
}

async function create(interaction: CommandInteraction, history?: TextChannel) {
    if (state !== undefined) return;

    const collector = interaction.channel!.createMessageComponentCollector();
    const status = initStatus();

    const promptMessage = (await interaction.reply({
        ...createStatusBody(status),
        fetchReply: true,
    })) as Message;

    state = {
        status,
        collector,
        promptMessage,
        history,
    };

    const taskQueue = new AsyncTaskQueue();
    const antiSpam = new AntiSpam(10_000);

    collector.on("collect", (i) => {
        if (!i.isSelectMenu()) return;

        taskQueue.enqueue(async () => {
            if (state === undefined) {
                console.error("State not found");
                return;
            }

            const now = new Date();
            const today = now.getDay();
            // If today is Saturday or Sunday
            if ([0, 6].includes(today)) {
                await i.user.send(
                    "Sorry, status reports are only active during school days"
                );
                return;
            }

            const hour = now.getHours();
            // If the time is not between 7am and 5pm
            if (hour < 7 || hour > 17) {
                await i.user.send(
                    "Sorry, status reports are only active during school hours"
                );
                return;
            }

            const selected = i.values[0];
            const start = parseInt(selected[0]);
            const end = parseInt(selected[1]);

            const { status, history } = state;

            const { user } = i;
            if (!antiSpam.tryInteract(user.id)) {
                await user.send(
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
                    await i.update(createStatusBody(status));

                    if (history) {
                        const embed = new MessageEmbed()
                            .setColor(isBroke ? "RED" : "GREEN")
                            .setAuthor(
                                `reported by ${user.tag}`,
                                user.avatarURL() ?? undefined
                            )
                            .setTitle(
                                `${start}-${end} is ${
                                    isBroke ? "down" : "back and running"
                                }!`
                            );
                        await history.send({ embeds: [embed] });
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
}

async function clear() {
    if (state === undefined) return;

    state.collector.stop("deletePrompt");
    await state.promptMessage.delete();

    state = undefined;
}

export default {
    get status() {
        return state?.status;
    },
    reset,
    create,
    clear,
} as EscalatorState;
