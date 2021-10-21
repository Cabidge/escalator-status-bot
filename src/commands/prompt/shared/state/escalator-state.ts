import {
    Message,
    MessageEmbed,
    Snowflake,
    TextBasedChannels,
} from "discord.js";
import { initStatus, RawStatus, Status } from "../status";
import { StatusPrompt } from "./status-prompt";

export interface StatusJson {
    type: "status";
    data: RawStatus;
}

export interface ChannelJson {
    type: "channel";
    id: Snowflake;
}

export interface MessageJson {
    type: "message";
    id: Snowflake;
    channel: ChannelJson;
}

export interface StateJson {
    status: StatusJson;
    history?: ChannelJson;
    prompt?: MessageJson;
}

export class EscalatorState {
    private prompt?: StatusPrompt;
    private _history?: TextBasedChannels;
    private hasChanged = false;

    constructor(public status: Status) {}

    set history(history: TextBasedChannels | undefined) {
        this._history = history;
        this.hasChanged = true;
    }

    get updatedJSON() {
        if (!this.hasChanged) return null;

        const status = this.status.toJSON() as StatusJson;

        const history =
            this._history &&
            ({
                type: "channel",
                id: this._history.id,
            } as ChannelJson);

        const prompt = this.prompt?.toJSON();

        return {
            status,
            history,
            prompt,
        } as StateJson;
    }

    async bindPromptTo(message: Message) {
        if (this.prompt) return;
        this.prompt = await StatusPrompt.inject(
            message,
            this,
            ({ start, end, isBroke, reporter }) => {
                if (this._history) {
                    const embed = new MessageEmbed()
                        .setColor(isBroke ? "RED" : "GREEN")
                        .setAuthor(
                            `reported by ${reporter.tag}`,
                            reporter.avatarURL() ?? undefined
                        )
                        .setTitle(
                            `${start}-${end} is ${
                                isBroke ? "down" : "back and running"
                            }!`
                        );

                    this._history.send({ embeds: [embed] });
                }
            }
        );
        this.hasChanged = true;
    }

    async reset() {
        this.status = initStatus();

        if (this.prompt) {
            await this.prompt.refresh();
        }

        if (this._history) {
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("All escalator statuses have been reset");

            await this._history.send({ embeds: [embed] });
        }

        this.hasChanged = true;
    }

    async deletePrompt() {
        if (this.prompt === undefined) return;

        await this.prompt.delete();

        this.prompt = undefined;

        this.hasChanged = true;
    }

    get hasPrompt() {
        return this.prompt !== undefined;
    }
}
