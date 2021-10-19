import {
    InteractionCollector,
    Message,
    MessageComponentInteraction,
    MessageEmbed,
    NewsChannel,
    Snowflake,
    TextChannel,
} from "discord.js";
import {
    createStatusBody,
    initStatus,
    newBlankStatus,
    RawStatus,
    ReportResult,
    Status,
} from "./status";
import { AsyncTaskQueue } from "./async-action-queue";
import { AntiSpam } from "./anti-spam";
import { readyClient } from "../../..";
import { RepoJson } from "../../../ghdb";

interface EscalatorState {
    readonly status: Status;
    readonly isActive: boolean;
    set history(value: TextChannel | NewsChannel | undefined);
    bind(message: Message): Promise<void>;
    reset(): Promise<void>;
    clear(): Promise<void>;
}

interface PromptState {
    message: Message;
    collector: InteractionCollector<MessageComponentInteraction>;
}

export interface StatusJson {
    type: "status";
    data: RawStatus;
}

interface ChannelJson {
    type: "channel";
    id: Snowflake;
}

interface MessageJson {
    type: "message";
    id: Snowflake;
    channel: ChannelJson;
}

interface StateJson {
    status: StatusJson;
    history?: ChannelJson;
    prompt?: MessageJson;
}

interface State {
    status: Status;
    history?: TextChannel | NewsChannel;
    prompt?: Message;
}

export default (async () => {
    const client = await readyClient;

    const repoJson = new RepoJson<StateJson>({
        token: process.env.ESC_GH_TOKEN!,
        userAgent: "escalator-status-bot",
        owner: "Cabidge",
        repo: "escalator-status-db",
        path: "state.json",
        defaultObj: {
            status: {
                type: "status",
                data: newBlankStatus(),
            },
        } as StateJson,
    });

    await repoJson.pull();

    let prompt: PromptState | undefined;
    let { status, history } = await (async () => {
        const json = repoJson.obj;
        const status = initStatus(json.status.data);

        let history: TextChannel | NewsChannel | undefined;
        if (json.history) {
            const channel = await client.channels.fetch(json.history.id);
            if (
                channel?.type == "GUILD_TEXT" ||
                channel?.type == "GUILD_NEWS"
            ) {
                history = channel as TextChannel | NewsChannel;
            }
        }

        if (json.prompt) {
            const channel = await client.channels.fetch(json.prompt.channel.id);
            if (channel?.isText()) {
                const message = await channel.messages.fetch(json.prompt.id);
                await bind(message);
            }
        }

        return { status, history };
    })();

    async function reset() {
        status = initStatus();

        if (prompt) {
            await prompt.message.edit(createStatusBody(status));
        }

        if (history) {
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("All escalator statuses have been reset");

            await history.send({ embeds: [embed] });
        }
    }

    async function bind(message: Message) {
        if (prompt) return;

        message = await message.edit(createStatusBody(status));
        const collector = message.channel.createMessageComponentCollector();

        prompt = { message, collector };

        const taskQueue = new AsyncTaskQueue();
        const antiSpam = new AntiSpam(10_000);

        collector.on("collect", (i) => {
            if (!i.isSelectMenu()) return;

            taskQueue.enqueue(async () => {
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
        if (prompt === undefined) return;

        prompt.collector.stop("deletePrompt");
        await prompt.message.delete();

        prompt = undefined;
    }

    return {
        get status() {
            return status;
        },
        set history(value: TextChannel | NewsChannel | undefined) {
            history = value;
        },
        get isActive() {
            return prompt !== undefined;
        },
        bind,
        reset,
        clear,
    } as EscalatorState;
})();
