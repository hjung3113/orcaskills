# Workflow Studio에서 Agent Workflow 만들기

Agent Workflow 모드는 기존 agent-workflow 운영 모델을 보이고 제약된 Orca 워크플로우로 제공합니다. 비슷한 이름의 에이전트를 자유롭게 늘어놓는 기능이 아닙니다.

## 1. 시각적 워크플로우 만들기

1. Workflow Studio에서 Git 프로젝트를 엽니다.
2. 왼쪽 워크플로우 패널에서 **Agent Workflow**를 선택합니다.
3. 캔버스에 다음 고정 흐름이 만들어집니다.

   ~~~text
   ARCHITECT -> CODEX implementation -> REVIEWER -> VERIFIER -> Release Captain decision
   ~~~

4. 각 단계를 선택해 이식 가능한 역할/프로필을 지정합니다. ARCHITECT, CODEX, REVIEWER, VERIFIER는 서로 다른 역할이어야 합니다. CODEX는 Inspector에 표시된 격리 Worktree 모드를 유지합니다.
5. 초기 값과 다를 때만 저장된 YAML에서 템플릿 issue 번호를 설정합니다. 이 값은 .review/ISSUE-<N>-VERIFY.json을 식별하며 명령 파라미터가 아닙니다.
6. 워크플로우를 저장합니다. 만들어진 이식 가능한 파일은 [예시](../examples/agent-workflow/.orca/workflows/agent-workflow.yaml)와 동등합니다.

템플릿은 raw command 필드, CODEX의 Worktree override, 자동 release 옵션, Release Captain 결정을 agent task로 바꾸는 기능을 의도적으로 노출하지 않습니다.

## 2. 로컬 toolkit 경계 설정하기

프로젝트 YAML은 공유할 수 있지만 Agent Workflow toolkit root는 공유하지 않습니다. 프로젝트의 기존 로컬 Workflow Studio 데이터 파일(로컬 provider 경로와 같은 위치)에 다음처럼 설정합니다.

~~~json
{
  "providers": {
    "codex": { "enabled": true, "executablePath": "/absolute/path/to/codex" }
  },
  "agentWorkflow": {
    "enabled": true,
    "toolkitRoot": "/absolute/path/to/feedbackops-workflow"
  }
}
~~~

Runner는 허용 목록의 toolkit script만 preflight합니다: cmux-dispatch.sh, conductor-rebuild.sh, verify.sh, review-archive.sh. REVIEWER는 별도의 보이는 terminal에서 선택한 전용 프로필을 사용하며 CODEX sandbox가 아닙니다. Runner는 workflow YAML에서 script 경로나 임의 shell 텍스트를 읽지 않습니다.

## 3. Orca에서 실행하기

프로젝트 로컬 skill을 사용합니다.

~~~text
/workflow validate <project-path> agent-workflow
/workflow run <project-path> agent-workflow
/workflow status <project-path> [run-id]
~~~

Runner는 template version, issue/branch/HEAD identity, 준비한 Worktree, 보이는 역할 pane handle, evidence 경로, cleanup 결과를 로컬 manifest에 기록합니다. 실시간 task, pane, Worktree, Decision Gate의 소유자는 Orca입니다.

## 4. evidence gate 읽기

독립 VERIFIER가 실행된 뒤 Runner는 현재 Worktree의 .review/ISSUE-<N>-VERIFY.json이 다음 조건을 모두 만족할 때만 release 준비로 인정합니다.

- producer_role: "VERIFIER"
- classifier: "PASS"
- verdict.exit_code: 0, verdict.failed: 0, verdict.passed >= 1
- 일치하는 issue 번호와 branch
- 현재 Worktree HEAD와 같은 head_sha

evidence가 없거나 오래됐거나 형식이 잘못됐거나 실패하면 recovery gate가 열립니다. 유효한 evidence면 **Release Captain** gate가 열립니다. Conductor와 Runner는 어느 gate도 해결할 수 없고 merge, push, release도 할 수 없습니다. Release Captain이 release 또는 abandon을 결정하면 기록된 pane/Worktree가 정리되고 evidence는 검토된 toolkit 경로로 archive됩니다.
