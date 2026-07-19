# Web-first 개발

Workflow Studio는 두 환경에서 하나의 renderer client 계약을 사용합니다.

~~~text
React renderer
  ├─ 브라우저 개발 -> 로컬 HTTP API -> WorkflowStudioService
  └─ Windows Electron -> preload IPC -> WorkflowStudioService
~~~

브라우저는 파일시스템이나 Orca CLI에 직접 접근하지 않습니다. 로컬 API는 개발 동반 기능으로 127.0.0.1에만 바인딩되며 Electron IPC와 같은 프로젝트·워크플로우·구성·미리보기·실행 동작을 제공합니다.

## WSL 브라우저 개발

저장소 루트에서 WSL 터미널 두 개를 사용합니다.

~~~bash
# 터미널 1: 로컬 전용 파일시스템/Orca API
npm --workspace @orca/workflow-studio run web:server

# 터미널 2: React/Vite renderer
npm --workspace @orca/workflow-studio run dev
~~~

Windows 브라우저에서 http://localhost:5173을 엽니다. 헤더에 Git 프로젝트의 **WSL 절대 경로**(예: /home/me/projects/example)를 입력한 뒤 **Open path**를 선택합니다. 브라우저는 Vite의 /api proxy를 경유하므로 WSL 파일시스템 마운트나 CLI 직접 접근이 필요하지 않습니다.

API는 허용 루트 아래의 프로젝트만 받습니다. 기본값은 이 저장소 루트입니다. 다른 상위 디렉터리에서 개발하려면 API 시작 전에 명시적으로 설정합니다.

~~~bash
WORKFLOW_STUDIO_PROJECT_ROOT=/home/me/projects \
  npm --workspace @orca/workflow-studio run web:server
~~~

이 API를 LAN 주소에 바인딩하거나 터널로 노출하지 마세요. 요청이 있으면 로컬 Git 프로젝트를 읽고 쓸 수 있으며 로컬 Orca runner도 호출할 수 있습니다.

## Windows 데스크톱 검증

실제 Electron 화면은 별도의 Windows checkout과 Windows Node/npm으로 검증합니다.

~~~powershell
npm install
npm run build
npm --workspace @orca/workflow-studio start
~~~

WSL checkout과 Windows checkout 사이에서 node_modules를 공유하지 마세요. React UI는 두 모드에서 같지만 브라우저 모드는 Linux/WSL 경로를, Windows Electron process는 Windows 경로를 사용합니다.
