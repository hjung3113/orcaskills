# Creating an Agent Workflow in Workflow Studio

Agent Workflow mode gives the existing `agent-workflow` operating model a visible, constrained Orca workflow. It is intentionally not a free-form collection of similarly named agents.

## 1. Create the visual workflow

1. Open a Git project in Workflow Studio.
2. In the left workflow panel, choose **Agent Workflow**.
3. The canvas creates the fixed flow:

   ```text
   ARCHITECT -> CODEX implementation -> REVIEWER -> VERIFIER -> Release Captain decision
   ```

4. Select each stage and assign its portable role/profile. ARCHITECT, CODEX, REVIEWER, and VERIFIER must remain distinct roles. CODEX remains in the isolated-worktree mode shown in the Inspector.
5. Set the template issue number in the saved YAML only if it differs from the initial value. It identifies `.review/ISSUE-<N>-VERIFY.json`; it is not a command parameter.
6. Save the workflow. The resulting portable file is equivalent to [the example](../examples/agent-workflow/.orca/workflows/agent-workflow.yaml).

The template deliberately does not expose a raw command field, worktree override for CODEX, automatic release option, or a way to turn the Release Captain decision into an agent task.

## 2. Configure the machine-local toolkit boundary

The project YAML is shareable. The Agent Workflow toolkit root is not. Configure it in the existing machine-local Workflow Studio data file for this project (the same location used for local provider paths):

```json
{
  "providers": {
    "codex": { "enabled": true, "executablePath": "/absolute/path/to/codex" }
  },
  "agentWorkflow": {
    "enabled": true,
    "toolkitRoot": "/absolute/path/to/feedbackops-workflow"
  }
}
```

The runner preflights only the allowlisted toolkit scripts: `cmux-dispatch.sh`, `conductor-rebuild.sh`, `verify.sh`, and `review-archive.sh`. REVIEWER uses its own selected profile in a separate visible terminal; it is not the CODEX sandbox. The runner never reads a script path or arbitrary shell text from workflow YAML.

## 3. Run from Orca

Use the project-local skill:

```text
/workflow validate <project-path> agent-workflow
/workflow run <project-path> agent-workflow
/workflow status <project-path> [run-id]
```

The runner records the template version, issue/branch/HEAD identity, prepared worktree, visible role-pane handles, evidence path, and cleanup outcome in its local manifest. Orca owns the live tasks, panes, worktrees, and Decision Gates.

## 4. Read the evidence gate

After the independent VERIFIER runs, the runner accepts readiness only when the current worktree contains `.review/ISSUE-<N>-VERIFY.json` with all of the following:

- `producer_role: "VERIFIER"`
- `classifier: "PASS"`
- `verdict.exit_code: 0`, `verdict.failed: 0`, and `verdict.passed >= 1`
- matching issue number and branch
- `head_sha` equal to the current worktree HEAD

Missing, stale, malformed, or failing evidence opens a recovery gate. Valid evidence opens the **Release Captain** gate. The Conductor and runner cannot resolve either gate, merge, push, or release. Once the Release Captain releases or abandons the run, the recorded panes/worktree are cleaned up and evidence is archived by the reviewed toolkit path.
