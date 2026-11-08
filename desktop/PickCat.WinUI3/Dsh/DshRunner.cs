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
/// Contract verified against dsh 0.2.1-rc.1: the CLI lives at
/// resources\runtime\cli\bin\dsh.cmd, honours DSH_HOME, and writes one JSON object
/// per line to stdout.
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
        string cli,
        string home,
        DshTask task,
        Action<JsonElement> onEvent,
        CancellationToken cancellation)
    {
        var start = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            WorkingDirectory = home,
        };
        start.ArgumentList.Add("/c");
        start.ArgumentList.Add(cli);
        start.ArgumentList.Add("--profile");
        start.ArgumentList.Add("headless");
        start.ArgumentList.Add("--json");
        start.ArgumentList.Add("--permission-mode");
        start.ArgumentList.Add("workspace-write");
        start.ArgumentList.Add(task.Prompt);
        start.Environment["DSH_HOME"] = home;

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
            onEvent(Error("dsh 进程启动失败"));
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
                onEvent(Log_entry(line));
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

    private static JsonElement Log_entry(string text) =>
        JsonDocument.Parse(JsonSerializer.Serialize(new { type = "log", text })).RootElement.Clone();

    private static JsonElement Error(string text) =>
        JsonDocument.Parse(JsonSerializer.Serialize(new { type = "error", text })).RootElement.Clone();
}
