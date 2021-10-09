import connections from "./connections";
import { stripIndent } from "common-tags";

export enum ReportResult {
    Success,
    Redundant,
    Invalid,
}

type Escalator = [number, number];

interface Status {
    report(start: number, end: number): ReportResult;
    resolve(start: number, end: number): ReportResult;
    readonly message: string;
    readonly splitStatuses: {
        readonly woke: Escalator[];
        readonly broke: Escalator[];
    };
}

export function initStatus(): Status {
    // Active = true
    // Deactive = false
    const statuses: Record<number, Record<number, boolean>> = {};

    // Holy damn, I need to rework this
    for (const start in connections) {
        // @ts-ignore
        statuses[start] = {};
        // @ts-ignore
        for (const end of connections[start]) {
            // @ts-ignore
            statuses[start][end] = true;
        }
    }

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
            const rows: string[] = [];
            forEachStatus(([start, end], isActive) => {
                const { light, wrap } = isActive ? activeStyle : deactiveStyle;
                rows.push(`${light} ${wrap}${start}-${end}${wrap}`);
            });

            return stripIndent`
                **Escalator Statuses:**
                \`\`\`py
                ${rows.join("\n")}
                \`\`\`
            `;
        },
        get splitStatuses() {
            return split();
        },
    };
}
