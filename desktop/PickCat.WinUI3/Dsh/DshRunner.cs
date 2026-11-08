using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PickCat.WinUI3.Dsh;

/// <summary>
/// Runs one `dsh --profile headless --json` task and streams its newline-delimited
/// events.
///
/// Contract verified against dsh 0.2.1-rc.1: the CLI entry sits inside app.asar,
/// which only Electron can read, so the Electron binary is launched with
/// ELECTRON_RUN_AS_NODE=1 rather than shelling out to dsh.cmd.
/// </summary>
internal sealed class DshTask
{
    public string Id { get; } = Guid.NewGuid().ToString("n")[..12];
    public string Prompt { get; }
    public List<JsonElement> Events { get; } = new();
    public bool Finished { get; private set; }
    public bool Failed { get; private set; }
    public string? FinalText { get; private set; }

    private readonly object _gate = new();

    public DshTask(string prompt) => Prompt = prompt;

    public void Add(JsonElement evt) { lock (_gate) Events.Add(evt); }

    public void Complete(string? text, bool failed)
    {
        lock (_gate)
        {
            FinalText = text;
            Failed = failed;
            Finished = true;
        }
    }

    public int EventCount { get { lock (_gate) return Events.Count; } }

    /// <summary>Events from <paramref name="since"/> onwards, copied for serialisation.</summary>
    public List<JsonElement> Snapshot(int since)
    {
        lock (_gate)
        {
            if (since < 0) since = 0;
            if (since > Events.Count) since = Events.Count;
            return Events.GetRange(since, Events.Count - since);
        }
    }
}

internal static class DshRunner
{
    private static readonly JsonDocumentOptions Json = new() { AllowTrailingCommas = true };

    /// <summary>Path to dsh.cmd inside the DSH installation shipped next to the app.</summary>
    public static string? ResolveCli()
    {
        var candidates = new List<string>();

        // 1. bundled beside our executable: <app>\dsh\runtime\cli\bin\dsh.cmd
        var bundled = Path.Combine(AppContext.BaseDirectory, "dsh", "runtime", "cli", "bin", "dsh.cmd");
        candidates.Add(bundled);

        // 2. an existing DeepSeek Harness install (%LOCALAPPDATA%\Programs\DeepSeek Harness)
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        candidates.Add(Path.Combine(local, "Programs", "DeepSeek Harness", "resources", "runtime", "cli", "bin", "dsh.cmd"));

        foreach (var path in candidates)
        {
            if (File.Exists(path)) return path;
        }
        return null;
    }

    /// <summary>
    /// The CLI lives inside app.asar, which only Electron can read, so we launch the
    /// Electron binary with ELECTRON_RUN_AS_NODE instead of shelling out to dsh.cmd
    /// (going through cmd.exe lost the argument list).
    /// </summary>
    public static (string Exe, string Cli)? ResolveLaunch()
    {
        var cmd = ResolveCli();
        if (cmd is null) return null;

        // <install>\resources\runtime\cli\bin\dsh.cmd -> <install>
        var bin = Path.GetDirectoryName(cmd)!;
        var root = Path.GetFullPath(Path.Combine(bin, "..", "..", "..", ".."));
        var exe = Path.Combine(root, "DeepSeek Harness.exe");
        var cli = Path.Combine(
            root, "resources", "app.asar", "dsh", "node_modules",
            "@deepseek-ai", "dsh-desktop-host", "lib", "cli.js");

        return File.Exists(exe) ? (exe, cli) : null;
    }

    /// <summary>Isolated DSH home so our settings do not leak into the user's own DSH.</summary>
    public static string ResolveHome()
    {
        var home = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "PickCat", "dsh-home");
        Directory.CreateDirectory(home);
        return home;
    }

    public static async Task RunAsync(
        (string Exe, string Cli) launch,
        string home,
        DshTask task,
        Action<JsonElement> onEvent,
        CancellationToken cancellation)
    {
        var start = new ProcessStartInfo
        {
            FileName = launch.Exe,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            WorkingDirectory = home,
        };
        start.ArgumentList.Add("--expose-internals");
        start.ArgumentList.Add(launch.Cli);
        start.ArgumentList.Add("--profile");
        start.ArgumentList.Add("headless");
        start.ArgumentList.Add("--json");
        start.ArgumentList.Add(task.Prompt);
        start.Environment["DSH_HOME"] = home;
        start.Environment["ELECTRON_RUN_AS_NODE"] = "1";

        using var process = new Process { StartInfo = start, EnableRaisingEvents = true };
        var stderr = new StringBuilder();

        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data is null) return;
            stderr.AppendLine(e.Data);
            Log.Write("dsh stderr: " + e.Data);
        };

        if (!process.Start())
        {
            task.Complete(null, true);
            onEvent(Simple("error", "dsh process failed to start"));
            return;
        }

        process.BeginErrorReadLine();

        var finalText = new StringBuilder();
        var failed = false;

        while (!process.StandardOutput.EndOfStream)
        {
            if (cancellation.IsCancellationRequested)
            {
                try { process.Kill(entireProcessTree: true); } catch { }
                break;
            }

            var line = await process.StandardOutput.ReadLineAsync(cancellation);
            if (string.IsNullOrWhiteSpace(line)) continue;

            JsonElement evt;
            try
            {
                using var doc = JsonDocument.Parse(line, Json);
                evt = doc.RootElement.Clone();
            }
            catch
            {
                // Non-JSON diagnostics are useful too; surface them as a log event.
                onEvent(Simple("log", line));
                continue;
            }

            task.Add(evt);
            onEvent(evt);

            if (evt.TryGetProperty("type", out var type))
            {
                switch (type.GetString())
                {
                    case "final":
                        if (evt.TryGetProperty("text", out var text)) finalText.Append(text.GetString());
                        break;
                    case "error":
                        failed = true;
                        break;
                    case "status":
                        if (evt.TryGetProperty("reason", out var reason) &&
                            reason.TryGetProperty("kind", out var kind) &&
                            kind.GetString() == "error")
                        {
                            failed = true;
                        }
                        break;
                }
            }
        }

        await process.WaitForExitAsync(cancellation);

        if (process.ExitCode != 0 && finalText.Length == 0) failed = true;
        task.Complete(finalText.Length > 0 ? finalText.ToString() : null, failed);

        if (failed && stderr.Length > 0)
        {
            Log.Write("dsh failed: " + stderr.ToString().Trim().Split('\n')[0]);
        }
    }

    private static JsonElement Simple(string type, string text) =>
        JsonDocument.Parse(JsonSerializer.Serialize(new { type, text })).RootElement.Clone();
}
