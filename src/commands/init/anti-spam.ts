import { Snowflake } from "discord.js";

export class AntiSpam {
    private lastInteracted: Record<Snowflake, number> = {};

    constructor(private cooldown: number) {}

    public tryInteract(id: Snowflake) {
        const now = Date.now();
        if (id in this.lastInteracted) {
            const timeElapased = now - this.lastInteracted[id];
            if (timeElapased < this.cooldown) {
                return false;
            }
        }

        this.lastInteracted[id] = now;
        return true;
    }
}
