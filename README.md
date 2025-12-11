# 경찰 신고 시스템 Discord 봇

Discord를 통한 경찰 신고 시스템 봇입니다.

## 기능

### 일반 유저 명령어

#### `/신고` 또는 `/112`
- 신고 유형을 선택할 수 있는 버튼 표시
- 신고 유형: 폭력, 절도, 교통사고, 실종, 사기
- 버튼 클릭 시 신고 접수

#### `/신고조회`
- 자신의 신고 내역 조회
- 신고 진행 상태 확인
- 상태: 접수 → 출동 → 도착 → 처리중 → 종결

### 관리자 명령어

#### `/112설정`
- 신고가 접수될 채널 지정
- 관리자 권한 필요

## 설치 방법

1. Node.js 설치 (v16 이상 권장)

2. 패키지 설치:
```bash
npm install
```

3. Discord 봇 생성:
   - [Discord Developer Portal](https://discord.com/developers/applications)에서 봇 생성
   - 봇 토큰 복사
   - Application ID 복사

4. `.env` 파일 생성:
   - `.env.example` 파일을 복사하여 `.env` 파일 생성
   - 또는 터미널에서 다음 명령어 실행:
     ```bash
     cp .env.example .env
     ```
   - `.env` 파일을 열어 토큰과 클라이언트 ID 입력:
     ```
     DISCORD_TOKEN=여기에_봇_토큰_입력
     CLIENT_ID=여기에_애플리케이션_ID_입력
     ```

5. 봇 초대:
   - Developer Portal에서 OAuth2 > URL Generator 선택
   - Scopes: `bot`, `applications.commands` 선택
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands` 선택
   - 생성된 URL로 봇 초대

6. 봇 실행:
```bash
npm start
```

## 사용 방법

1. 서버에서 `/112설정` 명령어로 신고 접수 채널 지정 (관리자만 가능)
2. `/신고` 또는 `/112` 명령어로 신고 접수
3. 신고 유형 선택
4. 경찰(관리자 또는 권한자)이 출동 → 도착 → 처리중 → 종결 순서로 진행
5. `/신고조회`로 자신의 신고 내역 확인

## 프로젝트 구조

```
Police System/
├── commands/           # 명령어 파일들
│   ├── 112.js
│   ├── report.js
│   ├── reportCheck.js
│   └── setup112.js
├── utils/             # 유틸리티 함수
│   └── dataManager.js
├── data/              # 데이터 저장 (자동 생성)
│   ├── reports.json
│   └── settings.json
├── config.json        # 봇 설정
├── index.js          # 메인 파일
├── package.json
└── README.md
```

## 주의사항

- `config.json` 파일에 민감한 정보(토큰)가 포함되어 있으므로 공개하지 마세요
- 봇이 작동하려면 적절한 권한이 필요합니다
- 데이터는 JSON 파일로 저장됩니다 (프로덕션 환경에서는 데이터베이스 사용 권장)

## 라이선스

MIT
