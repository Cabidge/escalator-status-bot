import { InteractionCollector, Message, User } from "discord.js";
import { AntiSpam } from "../anti-spam";
import { AsyncTaskQueue } from "../async-action-queue";
import { createStatusBody, ReportResult, Status } from "../status";
import { EscalatorState } from "./escalator-state";

interface Report {
    start: number;
    end: number;
    isBroke: boolean;
    reporter: User;
}

type OnReport = (report: Report) => void;

export class StatusPrompt {
    private collector: InteractionCollector<any>;

    private constructor(
        private message: Message,
        private state: EscalatorState,
        onReport: OnReport
    ) {
        const taskQueue = new AsyncTaskQueue();
        const antiSpam = new AntiSpam(10_000);

        this.collector = message.channel.createMessageComponentCollector();
        this.collector.on("collect", (i) => {
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

                const { status } = this.state;
                const result = (isBroke ? status.report : status.resolve)(
                    start,
                    end
                );

                switch (result) {
                    case ReportResult.Success:
                        await i.update(createStatusBody(status));

                        onReport({ start, end, isBroke, reporter: user });
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

    refresh = () => this.message.edit(createStatusBody(this.state.status));

    static async inject(
        message: Message,
        state: EscalatorState,
        onReport: OnReport
    ) {
        if (!message.editable)
            throw new Error("Prompt injection failed: Message is uneditable");

        const prompt = new StatusPrompt(message, state, onReport);

        await message.edit(createStatusBody(state.status));

        return prompt;
    }

    async delete() {
        this.collector.stop();
        await this.message.delete();
    }

    toJSON = () => ({
        type: "message",
        id: this.message.id,
        channel: {
            type: "channel",
            id: this.message.channelId,
        },
    });
}
