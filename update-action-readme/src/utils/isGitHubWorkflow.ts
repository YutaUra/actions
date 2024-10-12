export type GitHubWorkflowJobStep = {
  uses?: string;
};

const isGitHubWorkflowJobStep = (
  content: unknown,
): content is GitHubWorkflowJobStep => {
  if (typeof content !== "object" || content === null) return false;
  if ("uses" in content) {
    return typeof content.uses === "string";
  }
  return true;
};

export type GitHubWorkflowJob = {
  steps: GitHubWorkflowJobStep[];
};

const isGitHubWorkflowJob = (
  content: unknown,
): content is GitHubWorkflowJob => {
  if (typeof content !== "object" || content === null) return false;
  if ("steps" in content) {
    if (!Array.isArray(content.steps)) return false;
    return content.steps.every(isGitHubWorkflowJobStep);
  }
  return false;
};

export type GitHubWorkflow = {
  jobs: Record<string, GitHubWorkflowJob>;
};

export const isGitHubWorkflow = (
  content: unknown,
): content is GitHubWorkflow => {
  if (typeof content !== "object" || content === null) return false;
  if ("jobs" in content) {
    if (typeof content.jobs !== "object" || content.jobs === null) return false;
    return Object.values(content.jobs).every(isGitHubWorkflowJob);
  }
  return false;
};
