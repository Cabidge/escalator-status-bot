import { slashBranch } from "../slash-command";
import create from "./prompt/create";
import delete_ from "./prompt/delete";

export default slashBranch({
    name: "prompt",
    description: "",
    commands: [create, delete_],
});
