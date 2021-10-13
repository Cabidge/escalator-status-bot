import { slashBranch } from "../slash-command";
import create from "./prompt/create";

export default slashBranch({
    name: "prompt",
    description: "",
    commands: [create],
});
