import { spawn } from "child_process"

const ROOT = process.cwd()
const NPX_BIN = process.platform === "win32" ? "npx.cmd" : "npx"

async function runCommand(args: string[], label: string) {
  await new Promise<void>((resolve, reject) => {
    const command = process.platform === "win32" ? "cmd.exe" : NPX_BIN
    const commandArgs = process.platform === "win32"
      ? ["/d", "/s", "/c", `${NPX_BIN} ${args.join(" ")}`]
      : args

    console.log(`\n${label}`)
    console.log(`> ${NPX_BIN} ${args.join(" ")}`)

    const child = spawn(command, commandArgs, {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with exit code ${code}: ${NPX_BIN} ${args.join(" ")}`))
    })
  })
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("  Refresh 404 Backlog")
  console.log("═══════════════════════════════════════")

  await runCommand(["tsx", "scripts/update-broken-links.ts"], "[1/2] Scan linked products for dead/broken targets")
  await runCommand(["tsx", "scripts/build-test-page-status.ts"], "[2/2] Rebuild test page status from broken-links report")

  console.log("\n404 backlog refresh completed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
