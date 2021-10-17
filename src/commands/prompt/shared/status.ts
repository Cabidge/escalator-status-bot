import connections from "./connections";
import { stripIndent } from "common-tags";
import { MessageActionRow, MessageSelectMenu } from "discord.js";

export enum ReportResult {
    Success,
    Redundant,
    Invalid,
}

type Escalator = [number, number];

export interface Status {
    report(start: number, end: number): ReportResult;
    resolve(start: number, end: number): ReportResult;
    readonly message: string;
    readonly splitStatuses: {
        readonly woke: Escalator[];
        readonly broke: Escalator[];
    };
}

type RawStatus = Record<number, Record<number, boolean>>;

const blankStatus = {};
// Holy damn, I need to rework this
for (const start in connections) {
    // @ts-ignore
    blankStatus[start] = {};
    // @ts-ignore
    for (const end of connections[start]) {
        // @ts-ignore
        blankStatus[start][end] = true;
    }
}

export function initStatus(initialStatuses?: RawStatus): Status {
    const statuses = initialStatuses ?? { ...blankStatus };

    // Active = true
    // Deactive = false

    function forEachStatus(fn: (esc: Escalator, isActive: boolean) => void) {
        for (const start in statuses) {
            const destins = statuses[start];
            for (const end in destins) {
                const isActive = destins[end];
                fn([parseInt(start), parseInt(end)], isActive);
            }
        }
    }

    function isValid(a: number, b: number) {
        // @ts-ignore
        const c = connections[a];
        if (!c) return false;
        return c.includes(b);
    }

    function reportStatus(a: number, b: number, newActive: boolean) {
        if (!isValid(a, b)) return ReportResult.Invalid;
        if (newActive === statuses[a][b]) return ReportResult.Redundant;
        statuses[a][b] = newActive;
        return ReportResult.Success;
    }

    function split() {
        const woke: Escalator[] = [];
        const broke: Escalator[] = [];

        forEachStatus(([start, end], isActive) =>
            (isActive ? woke : broke).push([start, end])
        );

        return {
            woke,
            broke,
        };
    }

    const activeStyle = {
        light: "🟢",
        wrap: '"',
    };

    const deactiveStyle = {
        light: "🔴",
        wrap: "#",
    };

    return {
        report: (a, b) => reportStatus(a, b, false),
        resolve: (a, b) => reportStatus(a, b, true),
        get message() {
            let message = stripIndent`
                **Escalator Statuses:**
                \`\`\`py
            `;

            forEachStatus(([start, end], isActive) => {
                const { light, wrap } = isActive ? activeStyle : deactiveStyle;
                message += `\n${light} ${wrap}${start}-${end}${wrap}`;
            });

            message += "\n```";

            return message;
        },
        get splitStatuses() {
            return split();
        },
    };
}

export function createStatusBody(status: Status) {
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

    const { woke, broke } = status.splitStatuses;
    const components: MessageActionRow[] = [];
    if (woke.length > 0)
        components.push(
            createSelectRow(woke, "Escalator machine broke", "report")
        );
    if (broke.length > 0)
        components.push(
            createSelectRow(broke, "Escalator has been revived", "resolve")
        );

    return {
        components,
        content: status.message,
    };
}
