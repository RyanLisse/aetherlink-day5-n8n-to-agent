# Set up Workshop 4

Install Node.js 22 or newer, Git, and Claude Code. Claude Code uses your own Claude login. An API key is optional.

## Windows PowerShell

Install Node.js LTS and Git with `winget`:

```powershell
winget install --id OpenJS.NodeJS.LTS
winget install --id Git.Git
```

Install the native Claude Code CLI:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Open a new PowerShell window, log in once, and check the tools:

```powershell
claude
node --version
claude --version
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm ci
npm run doctor
npm run verify
```

Set an API key only when you choose the `sdk` backend:

```powershell
$env:ANTHROPIC_API_KEY = "your-key"
npm run lesson1 -- MSG-01 --backend sdk
```

In Command Prompt, set the same optional variable with `set ANTHROPIC_API_KEY=your-key`. Do not save it in a file or commit it.

## WSL

Keep the repository and Claude Code installation inside the Linux filesystem. Do not clone under `/mnt/c`.

```sh
sudo apt update
sudo apt install -y git curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
curl -fsSL https://claude.ai/install.sh | bash
claude
node --version
claude --version
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm ci
npm run doctor
npm run verify
```

Run `claude` once inside WSL and complete sign-in there. A Windows login is separate.

## Linux and macOS

Install Git and Node.js 22 or newer with your usual package manager. Install Claude Code:

```sh
curl -fsSL https://claude.ai/install.sh | bash
claude
node --version
claude --version
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm ci
npm run doctor
npm run verify
```

The default backend is `claude-code`. It uses the Claude Code login on this machine. Use `--backend sdk` only when you want to use an API key.
The Claude Code subprocess does not inherit `ANTHROPIC_API_KEY`; that key is for the `sdk` backend.

## Docker

The repository image installs Node.js 22, Git, Claude Code `2.1.287`, and the lesson dependencies. Claude Code auto-updates are disabled so the image stays reproducible.
The lessons require Claude Code `2.1.205` or newer: before that version invalid `--json-schema` schemas could be silently ignored.

```sh
docker build -t w4 .
docker run --rm w4
```

To run a lesson with Claude Code, create a token on the host with `claude setup-token`. Pass it to the container without writing it into the image:

```sh
docker run --rm -it -e CLAUDE_CODE_OAUTH_TOKEN w4 npm run lesson1 -- MSG-01
```

Inside Docker, `ANTHROPIC_API_KEY` is for `--backend sdk`; `claude-code` uses `CLAUDE_CODE_OAUTH_TOKEN`. The `sdk-login` backend is for your own local learning only. Anthropic's SDK documentation says third-party products may not offer claude.ai login for SDK agents without approval.

Do not mount `~/.claude` as the container login method. On macOS, Claude Code stores login credentials in the Keychain.

For a development loop, mount the checkout and keep Linux dependencies in a named volume:

```sh
docker run --rm -it -v "$PWD:/workshop" -v w4-node-modules:/workshop/node_modules -e CLAUDE_CODE_OAUTH_TOKEN w4 npm run lesson1 -- MSG-01
```

In PowerShell, use `-v "${PWD}:/workshop"` instead of `-v "$PWD:/workshop"`.
