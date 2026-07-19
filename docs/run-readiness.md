# Run Readiness

Run Readiness는 Workflow Studio에서 현재 열려 있는 워크플로우 draft에 한 가지 질문을 합니다. **이 draft를 지금 이 머신에서 미리볼 수 있는가?**

헤더 또는 Inspector에서 **Check readiness**를 선택합니다. 결과는 현재 프로젝트, 워크플로우 draft, 저장된 이식 가능한 구성에만 명시적으로 적용됩니다.

| 상태 | 의미 | 할 일 |
| --- | --- | --- |
| Not checked | 이 정확한 draft에 대해 아직 검사를 실행하지 않았습니다. | **Check readiness**를 선택합니다. |
| Blocked | 정적 워크플로우 진단 또는 로컬 runner preflight가 실패했습니다. | 각 blocker의 범위·이유·다음 행동을 읽고 수정한 뒤 다시 검사합니다. |
| Ready to preview | 워크플로우 draft와 로컬 preflight가 통과했습니다. | 예정된 Orca 작업을 확인하려면 **Preview execution**을 선택합니다. |

워크플로우를 변경하거나, 다른 프로젝트를 열거나, 이식 가능한 구성을 저장해 바꾸면 이전 결과는 무효화됩니다. Workflow Studio는 변경된 draft에 이전 검사 결과를 readiness로 사용하지 않습니다.

## 검사 대상

Readiness는 기존 워크플로우 검증과 runner preflight를 결합합니다. 역할/프로필 및 Conductor 해석, 필요할 때 검토된 로컬 Agent Workflow toolkit, Orca CLI 가용성, Orca runtime 가용성을 검사합니다. UI는 일반적인 실패 메시지 대신 위치가 정해진 blocker를 제공합니다.

렌더러는 프로젝트 경로와 워크플로우 소스만 제출합니다. Electron 또는 로컬 loopback API가 머신 로컬 구성을 직접 불러옵니다. toolkit 경로, 실행 파일 경로, 자격 증명, 원본 로컬 구성은 브라우저 렌더러에 들어가지 않습니다.

## blocker 수정

blocker가 워크플로우 노드를 가리킬 때는 **Go to node-id**를 제공합니다. 이 동작은 정확한 노드에 포커스를 맞추고 Inspector를 엽니다. Workflow Studio는 메시지 텍스트로 이동 대상을 추측하지 않습니다. 영향받은 모든 노드에는 텍스트 기반 **Blocked** 배지도 표시되므로 목록을 읽기 전에도 막힌 영역을 알 수 있습니다. Orca runtime 미가용처럼 머신 전체에 해당하는 blocker에는 노드 링크가 없으며, 로컬 환경에서의 해결 방법을 안내합니다.

draft 편집, 프로젝트 변경, 이식 가능한 구성 저장은 이전 결과와 노드 배지를 모두 지웁니다. 수정 후에는 readiness를 다시 검사하세요.

## 미리보기 경계

**Preview execution**은 Ready 결과 뒤에만 사용할 수 있습니다. Runner가 만들 Orca 작업을 보여 주지만 task, terminal, worktree, manifest, Decision Gate를 생성하지 않습니다. 실행 명령, release 결정, 실시간 runtime 대시보드가 아닙니다.

Agent Workflow에서 Run Readiness는 VERIFIER의 현재 HEAD PASS 아티팩트와 별개입니다. 전자는 실행 전 머신·구성 준비 상태이고, 후자는 검증 뒤 사람이 Release Captain 결정을 할 수 있게 하는 증거입니다.
