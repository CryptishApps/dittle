import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { run as runCommand, type RunResult } from "./lib.ts";

export type TimerFile = { path: string; content: string };
export type TimerPlan = { platform: "linux" | "darwin"; name: string; files: TimerFile[] };
export type TimerInput = {
  platform: NodeJS.Platform;
  projectName: string;
  mainCheckout: string;
  bunPath: string;
  intervalMinutes: number;
  home: string;
  xdgConfigHome?: string;
  pathEnv: string;
};

export function projectSlug(name: string, mainCheckout: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const hash = createHash("sha256").update(mainCheckout).digest("hex").slice(0, 8);
  return `${base || "project"}-${hash}`;
}

function systemdEscape(value: string): string {
  return value.replace(/%/g, "%%").replace(/\$/g, "$$$$");
}

function systemdQuote(value: string): string {
  return `"${systemdEscape(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const RUN_OR_REMOVE =
  'if cd "$2" 2>/dev/null; then if [ -f "$3" ]; then exec "$1" "$3"; fi; exit 0; fi; ' +
  'echo "Astack reaper: $2 no longer exists, so this timer removes itself."; ';

export const TIMER_GUARDS = {
  linux: `${RUN_OR_REMOVE}systemctl --user disable --now "$4"; rm -f "$5" "$6"; systemctl --user daemon-reload`,
  darwin: `${RUN_OR_REMOVE}rm -f "$5"; launchctl bootout "gui/$(id -u)/$4"`,
} as const;

export function timerCommand(
  platform: keyof typeof TIMER_GUARDS,
  input: Pick<TimerInput, "bunPath" | "mainCheckout">,
  name: string,
  files: string[],
): string[] {
  const reapScript = path.join(input.mainCheckout, "scripts", "astack", "reap.ts");
  return ["/bin/sh", "-c", TIMER_GUARDS[platform], "astack-reap", input.bunPath, input.mainCheckout, reapScript, name, ...files];
}

export function timerPlan(input: TimerInput): TimerPlan | null {
  const slug = projectSlug(input.projectName, input.mainCheckout);
  if (input.platform === "linux") {
    const unitDir = path.join(input.xdgConfigHome || path.join(input.home, ".config"), "systemd", "user");
    const name = `astack-reap-${slug}`;
    const servicePath = path.join(unitDir, `${name}.service`);
    const timerPath = path.join(unitDir, `${name}.timer`);
    const command = timerCommand("linux", input, `${name}.timer`, [servicePath, timerPath]);
    const service = [
      "[Unit]",
      `Description=Astack reaper for ${systemdEscape(input.projectName)}`,
      "",
      "[Service]",
      "Type=oneshot",
      `Environment=${systemdQuote(`PATH=${input.pathEnv}`)}`,
      `ExecStart=${command.map(systemdQuote).join(" ")}`,
      "",
    ].join("\n");
    const timer = [
      "[Unit]",
      `Description=Run the Astack reaper for ${systemdEscape(input.projectName)} every ${input.intervalMinutes} minutes`,
      "",
      "[Timer]",
      "OnActiveSec=2min",
      `OnUnitActiveSec=${input.intervalMinutes}min`,
      `Unit=${name}.service`,
      "",
      "[Install]",
      "WantedBy=timers.target",
      "",
    ].join("\n");
    return {
      platform: "linux",
      name: `${name}.timer`,
      files: [
        { path: servicePath, content: service },
        { path: timerPath, content: timer },
      ],
    };
  }
  if (input.platform === "darwin") {
    const label = `dev.astack.reap.${slug}`;
    const plistPath = path.join(input.home, "Library", "LaunchAgents", `${label}.plist`);
    const log = path.join(input.home, "Library", "Logs", `astack-reap-${slug}.log`);
    const command = timerCommand("darwin", input, label, [plistPath]);
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(label)}</string>
  <key>ProgramArguments</key>
  <array>
${command.map((arg) => `    <string>${xmlEscape(arg)}</string>`).join("\n")}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xmlEscape(input.pathEnv)}</string>
  </dict>
  <key>StartInterval</key>
  <integer>${input.intervalMinutes * 60}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(log)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(log)}</string>
</dict>
</plist>
`;
    return {
      platform: "darwin",
      name: label,
      files: [{ path: plistPath, content: plist }],
    };
  }
  return null;
}

export function timerSkipReason(env: NodeJS.ProcessEnv): string | null {
  if (env.ASTACK_NO_TIMER === "1") return "ASTACK_NO_TIMER=1 is set";
  if (env.CI) return "running in CI";
  return null;
}

export type Runner = (command: string, args: string[]) => RunResult;
export type TimerOutcome = { status: "skipped" | "installed" | "unchanged" | "unavailable" | "removed" | "absent"; message: string };

export function defaultTimerInput(projectName: string, mainCheckout: string, intervalMinutes: number, env = process.env): TimerInput {
  return {
    platform: process.platform,
    projectName,
    mainCheckout,
    bunPath: process.execPath,
    intervalMinutes,
    home: env.HOME || os.homedir(),
    xdgConfigHome: env.XDG_CONFIG_HOME,
    pathEnv: env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
  };
}

export function installTimer(input: TimerInput, options: { env: NodeJS.ProcessEnv; run?: Runner }): TimerOutcome {
  const skip = timerSkipReason(options.env);
  if (skip) return { status: "skipped", message: `Reaper timer not installed: ${skip}.` };
  const plan = timerPlan(input);
  if (!plan)
    return {
      status: "unavailable",
      message: `Reaper timer is not supported on ${input.platform}. Run bun scripts/astack/reap.ts now and then to stop idle services.`,
    };
  const exec = options.run ?? runCommand;
  const every = `every ${input.intervalMinutes} min`;

  if (plan.platform === "linux") {
    if (exec("systemctl", ["--user", "show-environment"]).code !== 0)
      return {
        status: "unavailable",
        message: "Reaper timer not installed: no systemd user session here. Run bun scripts/astack/reap.ts now and then to stop idle services.",
      };
    const changed = writeChanged(plan.files);
    if (changed && exec("systemctl", ["--user", "daemon-reload"]).code !== 0)
      return { status: "unavailable", message: "Reaper timer not installed: systemctl --user daemon-reload failed." };
    const enabled = exec("systemctl", ["--user", "is-enabled", plan.name]).code === 0;
    const active = exec("systemctl", ["--user", "is-active", plan.name]).code === 0;
    if (!changed && enabled && active) return { status: "unchanged", message: `Reaper timer already installed (${plan.name}, ${every}).` };
    const enable = exec("systemctl", ["--user", "enable", "--now", plan.name]);
    if (enable.code !== 0)
      return { status: "unavailable", message: `Reaper timer not started: systemctl --user enable --now ${plan.name} failed.\n${enable.stderr.trim()}` };
    return { status: "installed", message: `Reaper timer installed (${plan.name}, ${every}).` };
  }

  const changed = writeChanged(plan.files);
  const domain = `gui/${process.getuid?.() ?? 501}`;
  const loaded = exec("launchctl", ["print", `${domain}/${plan.name}`]).code === 0;
  if (!changed && loaded) return { status: "unchanged", message: `Reaper timer already installed (${plan.name}, ${every}).` };
  if (loaded) exec("launchctl", ["bootout", `${domain}/${plan.name}`]);
  const boot = exec("launchctl", ["bootstrap", domain, plan.files[0]!.path]);
  if (boot.code !== 0) return { status: "unavailable", message: `Reaper timer not loaded: launchctl bootstrap failed.\n${boot.stderr.trim()}` };
  return { status: "installed", message: `Reaper timer installed (${plan.name}, ${every}).` };
}

export function uninstallTimer(input: TimerInput, options: { run?: Runner } = {}): TimerOutcome {
  const plan = timerPlan(input);
  if (!plan) return { status: "absent", message: `No reaper timer on ${input.platform}.` };
  const exec = options.run ?? runCommand;
  const present = plan.files.some((file) => fs.existsSync(file.path));
  if (!present) return { status: "absent", message: "No reaper timer was installed for this project." };
  if (plan.platform === "linux") {
    exec("systemctl", ["--user", "disable", "--now", plan.name]);
    for (const file of plan.files) fs.rmSync(file.path, { force: true });
    exec("systemctl", ["--user", "daemon-reload"]);
  } else {
    exec("launchctl", ["bootout", `gui/${process.getuid?.() ?? 501}/${plan.name}`]);
    for (const file of plan.files) fs.rmSync(file.path, { force: true });
  }
  return { status: "removed", message: `Removed the reaper timer (${plan.name}).` };
}

function writeChanged(files: TimerFile[]): boolean {
  let changed = false;
  for (const file of files) {
    const current = fs.existsSync(file.path) ? fs.readFileSync(file.path, "utf8") : null;
    if (current === file.content) continue;
    fs.mkdirSync(path.dirname(file.path), { recursive: true });
    fs.writeFileSync(file.path, file.content);
    changed = true;
  }
  return changed;
}
