import { slashBranch } from "../slash-command";
import create from "./prompt/create";
import delete_ from "./prompt/delete";
import reset from "./prompt/reset";

export default slashBranch({
    name: "prompt",
    description: "Status prompt commands",
    commands: [create, delete_, reset],
});
