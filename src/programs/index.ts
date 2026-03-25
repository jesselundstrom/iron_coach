import { casualFullBodyProgram } from './casualfullbody';
import { forgeProgram } from './forge';
import { hypertrophySplitProgram } from './hypertrophysplit';
import { strongLifts5x5Program } from './stronglifts5x5';
import { wendler531Program } from './wendler531';

export const typedProgramRegistry = {
  casualfullbody: casualFullBodyProgram,
  forge: forgeProgram,
  hypertrophysplit: hypertrophySplitProgram,
  stronglifts5x5: strongLifts5x5Program,
  wendler531: wendler531Program,
};
