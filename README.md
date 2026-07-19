# Orca Workflow Studio

> 재사용 가능한 멀티 에이전트 개발 워크플로우를 시각적으로 설계하고 Orca에서 실행합니다.

Orca Workflow Studio는 프로젝트 로컬 Git 저장소의 워크플로우 DAG를 편집하는 Electron 데스크톱 에디터입니다. 에이전트 작업, 승인, 조건, 병렬 분기, 종료 상태를 n8n 스타일 캔버스에서 구성하며 실제 에이전트 실행의 권한은 Orca에 남겨 둡니다.

## 제공 기능

- 기존 Git 프로젝트의 .orca/workflows/*.yaml을 편집합니다.
- 캔버스 우선 DAG 에디터, 접을 수 있는 단계 목록, 고정 Inspector를 제공합니다.
- 시작, 에이전트, 승인, 조건, 병렬, 종료 노드를 지원합니다.
- YAML, 그래프 구조, 역할/프로필 해석, 구조화된 핸드오프, 안전하지 않은 동시 Worktree 쓰기를 실행 전에 검증합니다.
- 이식 가능한 워크플로우 역할을 에이전트 프로필 및 제공자/모델 정책으로 해석하며, 실행 파일과 자격 증명은 로컬 머신에만 둡니다.
- 검토된 로컬 CLI 역량만 제한적·비대화형 probe로 탐색합니다. 탐색은 로그인, 자격 증명 사용, 원격 카탈로그 호출을 하지 않습니다.
- Agent 노드는 역할 → 프로필 → 모델 정책 순서로 설정하며, 프리셋 적용과 저장 전 검토를 명시적으로 진행합니다.
- 검증된 워크플로우를 Orca 어댑터로 미리보기·실행하고 로컬 실행 manifest를 남깁니다.
- 승인에는 Orca Decision Gate를 쓰고, 실패·에스컬레이션은 재시도·프로필 교체·종료를 명시적으로 선택할 때까지 멈춥니다.
- Agent Workflow 템플릿으로 ARCHITECT → 격리 CODEX → 독립 REVIEWER → 독립 VERIFIER → Release Captain 결정을 제공합니다.

Workflow Studio는 에디터·검증기·미리보기 화면입니다. **실시간 작업 상태, dispatch, 승인 기록, 복구 결정의 원본은 항상 Orca입니다.**

## 아키텍처

~~~text
워크플로우 DAG -> 역할 / 의도 -> 에이전트 프로필 -> 제공자 / 런타임 / 모델
       |                                          |
       +-- Studio가 편집·검증                         +-- 로컬 전용 머신 설정

검증된 워크플로우 -> WorkflowRunner -> Orca 작업, dispatch, gate, Worktree
~~~

Runner는 노드 사이에 구조화된 출력과 아티팩트 참조를 전달합니다. 원본 에이전트 전체 출력은 의도적으로 opt-in이므로 핸드오프가 검토 가능하고 제한된 크기로 유지됩니다.

## 빠른 시작

필수 조건: Node.js와 npm. 워크플로우 실행에는 실행 중인 Orca 환경도 필요합니다.

~~~bash
git clone https://github.com/hjung3113/orcaskills.git
cd orcaskills
npm install
npm run build
npm --workspace @orca/workflow-studio start
~~~

렌더러 개발은 다음처럼 실행합니다.

~~~bash
npm run dev
~~~

### WSL 친화적 웹 개발

UI 반복 작업에서는 WSLg/Electron 대신 로컬 API와 Vite를 각각 WSL 터미널에서 실행하고, Windows 브라우저로 http://localhost:5173을 엽니다.

~~~bash
# 터미널 1
npm --workspace @orca/workflow-studio run web:server

# 터미널 2
npm --workspace @orca/workflow-studio run dev
~~~

WSL 절대 Git 프로젝트 경로를 입력한 뒤 **Open path**를 선택합니다. 브라우저는 Electron과 같은 클라이언트 계약을 사용하지만 loopback 로컬 API와만 통신하므로 파일시스템이나 Orca CLI 권한을 직접 받지 않습니다. 허용 루트 설정과 Windows 네이티브 Electron 검증은 [web-first 개발 안내](docs/web-first-development.md)를 참고하세요.

검증 명령:

~~~bash
npm run test
npm run typecheck
npm run build
~~~

## 워크플로우 구성

워크플로우 정의는 자동화할 코드와 같은 프로젝트에 둡니다.

~~~text
your-project/
├── .orca/
│   ├── workflows/
│   │   └── feature-delivery.yaml
│   ├── roles.yaml
│   └── agent-profiles.yaml
└── .agents/
    └── skills/
        └── orca-workflow/
~~~

초기 워크플로우는 다음처럼 작게 시작할 수 있습니다.

~~~yaml
id: feature-delivery
name: Feature delivery
nodes:
  - id: start
    type: start
  - id: end
    type: end
    dependsOn: [start]
~~~

이후 Agent 노드에 명시적 역할, 프롬프트, 접근 모드, Worktree 정책, 구조화된 입력·출력을 추가합니다. 전체 제품 계약은 [Workflow Studio 명세](.scratch/orca-workflow-studio/spec.md)에 있습니다.

### 안내형 구성

Git 프로젝트를 열고 Agent 노드를 선택한 다음 Inspector에서 역할과 프로필을 고릅니다. Studio는 프로젝트를 열 때와 **Refresh capabilities**를 선택했을 때만 검토된 로컬 capability adapter를 새로 고칩니다. 사용할 수 없는 역량은 이유와 함께 표시되며, Studio가 모델을 지어내거나 백그라운드에서 프로젝트 구성을 바꾸지 않습니다.

프로필과 프리셋은 .orca/workflow-config.yaml에서 이식 가능하게 유지됩니다. 실행 파일 경로, 자격 증명, 탐색 데이터는 로컬에만 남습니다. **Review configuration**은 바뀔 이식 가능한 값을 나열하고, 구성을 실제로 쓰는 동작은 **Confirm save**뿐입니다. 프리셋 적용은 현재 draft에 역할/프로필 선택을 복사하며 이후 프리셋을 바꿔도 기존 노드는 조용히 변경되지 않습니다.

처음 여는 프로젝트에 portable 구성이 없으면 Agent Inspector에서 의미 있는 역할 이름·역할 의도·프로필 이름을 입력하고, 현재 사용 가능한 로컬 후보만 선택해 초안으로 만듭니다. Agent Workflow에서는 ARCHITECT, CODEX, REVIEWER, VERIFIER의 네 역할 초안을 함께 만들 수 있습니다. 이 동작도 메모리에서만 진행되며 **Review configuration → Confirm save** 전에는 `.orca/workflow-config.yaml`을 쓰지 않습니다.

Agent 노드의 **Additional instructions**는 선택한 역할의 base instruction 뒤에 추가됩니다. Prompt preset은 이 텍스트를 노드로 복사할 뿐 연결을 유지하지 않습니다. 기존 `prompt`가 있는 워크플로우는 기존 replacement 동작을 보존하며, Inspector의 명시적 migration을 선택한 뒤 workflow를 저장할 때만 additive semantics로 전환합니다. Approval 노드의 Prompt 동작은 변하지 않습니다.

Conductor는 선택적 읽기 전용 워크플로우 조언자입니다. 컨텍스트 준비, 프롬프트 개선, 핸드오프 요약, 에스컬레이션 조언은 할 수 있지만 코드 편집이나 Orca 작업·터미널·dispatch·Decision Gate 관리는 할 수 없습니다. 전체 경계는 [drill-down PRD](.scratch/workflow-studio-drilldown-configuration/prd.md)와 [탐색 ADR](docs/adr/0001-bounded-local-capability-discovery.md)를 참고하세요.

### Agent Workflow 모드

워크플로우 목록에서 **✦ Agent Workflow**를 선택하면 고정된 시각적 멀티 에이전트 흐름이 만들어집니다. 이 템플릿은 서로 다른 ARCHITECT, CODEX, REVIEWER, VERIFIER 역할을 요구합니다. CODEX는 격리 Worktree와 허용 목록 기반 로컬 toolkit dispatch를 사용합니다. Runner는 현재 HEAD의 VERIFIER PASS 아티팩트만 release 준비 신호로 받아들이고, 이후 사람이 Release Captain으로 Orca Decision Gate를 결정합니다. Gate를 자동으로 해제하거나 merge, push, release하지 않습니다.

템플릿은 이식 가능하며 toolkit root는 로컬 머신 설정에 둡니다. 자세한 설정과 화면 사용법은 [Agent Workflow 예시](docs/agent-workflow-example.md), [PRD](.scratch/agent-workflow-mode/prd.md), [ADR](docs/adr/0002-agent-workflow-template-and-runner-profile.md)를 참고하세요.

### Run Readiness와 실행 미리보기

실행 전에 **Check readiness**를 선택하면 현재 draft를 워크플로우 진단, 역할/프로필과 Conductor 구성, 필요한 로컬 toolkit, Orca CLI, Orca runtime에 대해 평가합니다. Inspector에는 **Not checked**, **Blocked**, **Ready to preview** 중 하나가 표시됩니다. 모든 blocker는 범위·이유·다음 행동을 알려 줍니다. 노드별 blocker에는 해당 노드와 Inspector로 이동하는 **Go to node-id**가 있고, 영향받은 캔버스 노드에는 텍스트 기반 **Blocked** 배지가 나타납니다. draft·프로젝트·저장된 이식 구성 변경은 이전 결과와 배지를 무효화합니다.

Ready 상태에서만 **Preview execution**이 활성화됩니다. 미리보기는 예정된 Orca 작업을 보여 주지만 task, terminal, worktree, manifest, Decision Gate를 만들지 않습니다. 렌더러는 로컬 경로나 자격 증명을 받지 않으며 Electron 또는 loopback API가 서버 소유 구성으로 runner request를 만듭니다. 전체 동작과 경계는 [Run Readiness](docs/run-readiness.md)를 참고하세요.

## Orca에서 워크플로우 실행

프로젝트 로컬 [orca-workflow](.agents/skills/orca-workflow/SKILL.md) skill은 Codex와 Claude 터미널에 동일한 명령 경계를 제공합니다.

~~~text
/workflow list <project-path>
/workflow validate <project-path> <workflow-id>
/workflow run <project-path> <workflow-id>
/workflow status <project-path> [run-id]
~~~

명령을 호출한 터미널은 launcher일 뿐이며, 각 Agent 노드는 워크플로우가 선택한 프로필을 사용합니다. 상태는 Orca 기반 gate와 멈춘 경로를 보고하지만 자동으로 해결하지는 않습니다.

## 안전 모델

- 동시에 쓸 가능성이 있는 Same-Worktree Agent 노드는 거부됩니다.
- 독립적인 동시 쓰기는 명시적인 격리 Worktree가 필요합니다.
- Approval 노드는 Orca Decision Gate가 됩니다.
- 실패와 에스컬레이션은 영향받은 경로를 멈춥니다. MVP에는 자동 재시도나 자동 에이전트 전환이 없습니다.
- 자격 증명, 실행 파일 경로, 기타 머신 전용 설정은 공유 프로젝트 구성에서 제외됩니다.

## 프로젝트 구성

~~~text
apps/workflow-studio/      Electron 앱, renderer, validation, runner
.agents/skills/            프로젝트 로컬 Codex/Claude skill
.scratch/orca-workflow-studio/
  spec.md                  승인된 제품 명세
  issues/                  의존성 인식 로컬 구현 티켓
docs/plans/                제품·전달 계획
prototype/workflow-studio/ 폐기 가능한 UI 탐색용 코드, 제품 코드 아님
examples/agent-workflow/   이식 가능한 Agent Workflow 예시
~~~

## 검증 상태

테스트 모음은 워크플로우 파싱과 round trip, 구성 해석, runner adapter 경계, 승인/실패 중단, 병렬 Worktree 안전성, 명령 동작, 대표적인 mock end-to-end 워크플로우를 다룹니다.

~~~text
58 tests passing
TypeScript typecheck passing
Production build passing
Electron startup uses the production CommonJS Electron entrypoint
~~~

Electron 시각적 작성 smoke 결과는 [smoke-test 결과](apps/workflow-studio/tests/e2e/SMOKE-RESULTS.md)에 기록되어 있습니다. drill-down 구현에는 안전한 탐색, 단계적 검토, 프리셋 복사, 노드 수준 프로필 해석에 대한 단위 테스트가 추가되어 있습니다.

## 로드맵

[공개 이슈](https://github.com/hjung3113/orcaskills/issues), 로컬 [기본 구현 티켓](.scratch/orca-workflow-studio/issues/), [Agent Workflow 티켓](.scratch/agent-workflow-mode/issues/)을 참고하세요. Studio의 실시간 runtime 모니터링, 루프, 스케줄, webhook, 자동 재시도, 자율 복구는 첫 릴리스 범위 밖입니다.

## 참고 자료

README 구성은 잘 관리되는 워크플로우·데스크톱 프로젝트인 [n8n](https://github.com/n8n-io/n8n), [Electron](https://github.com/electron/electron), [React Flow](https://github.com/xyflow/xyflow)에서 영감을 받았습니다. Orca Workflow Studio는 이들과 제휴 관계가 없습니다.
