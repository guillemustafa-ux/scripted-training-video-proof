const ACTIONS = {
  caption: { target: false, value: false },
  highlight: { target: true, value: false },
  click: { target: true, value: false },
  fill: { target: true, value: true },
  select: { target: true, value: true },
};

export function validateScript(script) {
  const errors = [];
  if (!script || typeof script !== "object") return ["script must be an object"];
  if (typeof script.title !== "string" || !script.title.trim()) errors.push("title is required");
  if (typeof script.url !== "string" || !script.url.trim()) errors.push("url is required");
  if (!Array.isArray(script.steps) || script.steps.length === 0) {
    errors.push("steps must be a non-empty array");
    return errors;
  }
  script.steps.forEach((step, i) => {
    const at = `steps[${i}]`;
    const rule = ACTIONS[step?.action];
    if (!rule) {
      errors.push(`${at}: unknown action "${step?.action}"`);
      return;
    }
    if (typeof step.text !== "string" || !step.text.trim()) errors.push(`${at}: text (narration) is required`);
    if (rule.target && (typeof step.target !== "string" || !step.target.trim())) errors.push(`${at}: target is required for ${step.action}`);
    if (!rule.target && step.target !== undefined) errors.push(`${at}: ${step.action} takes no target`);
    if (rule.value && typeof step.value !== "string") errors.push(`${at}: value is required for ${step.action}`);
    if (step.holdMs !== undefined && !(Number.isInteger(step.holdMs) && step.holdMs >= 500 && step.holdMs <= 15000)) {
      errors.push(`${at}: holdMs must be an integer between 500 and 15000`);
    }
  });
  return errors;
}

export function targetsOf(script) {
  return [...new Set(script.steps.filter((s) => s.target).map((s) => s.target))];
}

export function selectorFor(target) {
  return `[data-testid="${target.replace(/"/g, '\\"')}"]`;
}
