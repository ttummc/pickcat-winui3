using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PickCat.WinUI3.Dsh;

/// <summary>One kernel run: a single turn of a conversation.</summary>
internal sealed class DshTask
{
    public string Id { get; } = Guid.NewGuid().ToString("n")[..12];
    public string ChatId { get; }
    public string Prompt { get; }
    public List<JsonElement> Events { get; } = new();
    public bool Finished { get; private set; }
    public bool Failed { get; private set; }
    public string? FinalText { get; private set; }

    /// <summary>Session id the kernel reported, used to continue the conversation.</summary>
    public string KernelSession { get; private set; } = "";

    private readonly object _gate = new();

    public DshTask(string prompt, string chatId)
    {
        Prompt = prompt;
        ChatId = chatId;
    }

    public void Add(JsonElement evt)
    {
        lock (_gate)
        {
            Events.Add(evt);
            if (KernelSession.Length == 0 &&
                evt.TryGetProperty("type", out var type) &&
                type.GetString() == "session" &&
                evt.TryGetProperty("sessionId", out var session))
            {
                KernelSession = session.GetString() ?? "";
            }
        }
    }

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

    /// <summary>Path to dsh.cmd inside the bundled kernel, or an existing DSH install.</summary>
    public static string? ResolveCli()
    {
        var candidates = new List<string>
        {
            Path.Combine(AppContext.BaseDirectory, "dsh", "resources", "runtime", "cli", "bin", "dsh.cmd"),
        };

        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        candidates.Add(Path.Combine(local, "Programs", "DeepSeek Harness", "resources", "runtime", "cli", "bin", "dsh.cmd"));

        foreach (var path in candidates)
        {
            if (File.Exists(path)) return path;
        }
        return null;
    }

    /// <summary>
    /// The CLI lives inside app.asar, which only Electron can read, so the Electron
    /// binary is launched with ELECTRON_RUN_AS_NODE instead of shelling out to dsh.cmd.
    /// </summary>
    public static (string Exe, string Cli)? ResolveLaunch()
    {
        var cmd = ResolveCli();
        if (cmd is null) return null;

        // <root>\resources\runtime\cli\bin\dsh.cmd -> <root>
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
        string workspace,
        string? apiKey,
        string? kernelSession,
        DshTask task,
        Action<JsonElement> onEvent,
        CancellationToken cancellation)
    {
        Directory.CreateDirectory(workspace);
        var start = new ProcessStartInfo
        {
            FileName = launch.Exe,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            WorkingDirectory = workspace,
        };
        start.ArgumentList.Add("--expose-internals");
        start.ArgumentList.Add(launch.Cli);
        start.ArgumentList.Add("--profile");
        start.ArgumentList.Add("headless");
        start.ArgumentList.Add("--json");
        if (!string.IsNullOrEmpty(kernelSession))
        {
            start.ArgumentList.Add("--session-id");
            start.ArgumentList.Add(kernelSession);
        }
        start.ArgumentList.Add(task.Prompt);

        start.Environment["DSH_HOME"] = home;
        start.Environment["ELECTRON_RUN_AS_NODE"] = "1";
        // The kernel reads the key from the environment when no credential file exists.
        if (!string.IsNullOrEmpty(apiKey)) start.Environment["DEEPSEEK_API_KEY"] = apiKey;

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
