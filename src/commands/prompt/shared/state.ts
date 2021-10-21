import { initStatus, newBlankStatus } from "./status";
import { RepoJson } from "../../../ghdb";
import { EscalatorState, StateJson } from "./state/escalator-state";
import { Client } from "discord.js";

// Hacky work around for a problem that i still don't understand
// Importing from index is undefined for some reason
let resolve: (a: any) => void;

const state = new Promise<EscalatorState>((res) => {
    resolve = res;
});

export async function onClientReady(client: Client<true>) {
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

    let state = await (async () => {
        const json = repoJson.obj;
        const status = initStatus(json.status.data);

        const state = new EscalatorState(status);

        if (json.history) {
            const channel = await client.channels.fetch(json.history.id);
            if (channel?.isText()) state.history = channel;
        }

        if (json.prompt) {
            const channel = await client.channels.fetch(json.prompt.channel.id);
            if (channel?.isText()) {
                const message = await channel.messages.fetch(json.prompt.id);
                await state.bindPromptTo(message);
            }
        }

        return state;
    })();

    // Max 1000 repo interactions per hour
    // 1 commit per 5 seconds is enough to stay under rate limit
    setInterval(() => {
        const updatedJSON = state.updatedJSON;
        if (updatedJSON === null) return;

        repoJson.obj = updatedJSON;
        repoJson.push("Updated state");
    }, 5_000);

    resolve(state);
}

export default state;
