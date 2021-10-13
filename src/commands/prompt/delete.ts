import { slashLeaf } from "../../slash-command";
import { adminOnly } from "../../slash-command/guards";

export default slashLeaf({
    name: "delete",
    description: "Deletes the created prompt",
    guards: [adminOnly],
    async execute(interaction) {},
});
