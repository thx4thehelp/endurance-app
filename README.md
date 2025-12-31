# Endurance - Ethereum Wallet Recovery Tool

Ethereum 지갑 복구 도구입니다. 무작위 테스트, 니모닉 복구, 프라이빗키 복구 기능을 제공합니다.

## Features

- **무작위 테스트**: 무작위로 지갑을 생성하고 잔액을 조회
- **니모닉 복구**: 일부 단어를 알고 있는 니모닉의 나머지 단어를 브루트포스
- **프라이빗키 복구**: 일부 문자를 알고 있는 프라이빗키의 나머지 문자를 브루트포스
- **결과 저장**: 모든 조회 결과를 로컬 SQLite 데이터베이스에 저장
- **검색 기능**: 저장된 지갑 주소/프라이빗키 검색
- **자동 업데이트**: 새 버전 출시 시 자동 알림 및 업데이트

## Tech Stack

- **Frontend**: SvelteKit 5 + TypeScript
- **Desktop**: Tauri 2.0 (Rust)
- **Database**: SQLite (tauri-plugin-sql)
- **Crypto**: ethers.js

## Supported Platforms

| Platform | 지원 여부 |
|----------|----------|
| macOS (Apple Silicon) | O |
| Windows (x64) | O |
| Linux (Ubuntu 24.04+) | O |

> Intel Mac은 지원하지 않습니다.

## Installation

### Prerequisites

- Node.js 20+
- Rust (latest stable)
- Platform-specific dependencies:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools, WebView2
  - **Linux (Ubuntu 24.04)**: `webkit2gtk-4.1`, `libappindicator3-1`

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Data Storage

지갑 데이터는 각 OS의 앱 데이터 폴더에 저장됩니다:

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/com.endurance.wallet-recovery/endurance_wallets.db` |
| Windows | `%APPDATA%\com.endurance.wallet-recovery\endurance_wallets.db` |
| Linux | `~/.local/share/com.endurance.wallet-recovery/endurance_wallets.db` |

## Download

<a href="https://endurance.work/start" target="_blank">공식 홈페이지</a>에서 플랫폼별 빌드를 다운로드할 수 있습니다.

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `Endurance_x.x.x_aarch64.dmg` |
| Windows | `Endurance_x.x.x_x64-setup.exe` |
| Linux (Debian/Ubuntu 24.04+) | `endurance_x.x.x_amd64.deb` |
| Linux (AppImage) | `Endurance_x.x.x_amd64.AppImage` |

## License

MIT
