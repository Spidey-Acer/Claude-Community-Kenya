export interface ParsedAction {
  type: string;
  label: string;
  url: string;
}

export interface ParseResult {
  text: string;
  actions: ParsedAction[];
}

const ACTION_REGEX = /\[action:([^\]]+)\]\(([^|]+)\|([^)]+)\)/g;

export function parseActions(content: string): ParseResult {
  const actions: ParsedAction[] = [];

  const text = content.replace(ACTION_REGEX, (_, type, label, url) => {
    actions.push({
      type: type.trim(),
      label: label.trim(),
      url: url.trim(),
    });
    return "";
  });

  return {
    text: text.replace(/\n{3,}/g, "\n\n").trim(),
    actions,
  };
}
