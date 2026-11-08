using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace PickCat.WinUI3.Dsh;

/// <summary>
/// Runs the kernel's own web application (`dsh web`) and exposes its URL.
///
/// The official UI already implements model pickers, permission presets, plan and
/// diff rendering, attachments and slash commands, so embedding it gives feature
/// parity without re-implementing any of it. It sends no X-Frame-Options or CSP
/// frame-ancestors, so a frame is allowed.
/// </summary>
internal sealed class DshWeb : IDisposable
{
    private Process? _process;

    /// <summary>URL with the one-time access token, or null while starting.</summary>
    public string? Url { get; private set; }

    public bool Running => _process is { HasExited: false };

    public void Start()
    {
        var launch = DshRunner.ResolveLaunch();
        if (launch is null)
        {
            Log.Write("dsh web: kernel not found");
            return;
        }

        var start = new ProcessStartInfo
        {
            FileName = launch.Value.Exe,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = new UTF8Encoding(false),
            StandardErrorEncoding = new UTF8Encoding(false),
            WorkingDirectory = DshRunner.ResolveHome(),
        };
        start.ArgumentList.Add("--expose-internals");
        start.ArgumentList.Add(launch.Value.Cli);
        start.ArgumentList.Add("web");
        start.ArgumentList.Add("--port");
        start.ArgumentList.Add("0");
        start.ArgumentList.Add("--no-open");
        start.ArgumentList.Add("--host");
        start.ArgumentList.Add("127.0.0.1");

        start.Environment["DSH_HOME"] = DshRunner.ResolveHome();
        start.Environment["ELECTRON_RUN_AS_NODE"] = "1";
        var key = DshStore.ReadKey();
        if (!string.IsNullOrEmpty(key)) start.Environment["DEEPSEEK_API_KEY"] = key;

        try
        {
            _process = Process.Start(start);
        }
        catch (Exception ex)
        {
            Log.Error("dsh web start", ex);
            return;
        }
        if (_process is null) return;

        _process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data is not null) Log.Write("dsh web stderr: " + e.Data);
        };
        _process.BeginErrorReadLine();

        // The launcher prints "dsh web: http://127.0.0.1:PORT/?token=…" once ready.
        _ = Task.Run(async () =>
        {
            try
            {
                while (!_process.StandardOutput.EndOfStream)
                {
                    var line = await _process.StandardOutput.ReadLineAsync();
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    Log.Write("dsh web: " + line);
                    var index = line.IndexOf("http://", StringComparison.Ordinal);
                    if (index >= 0)
                    {
                        Url = line[index..].Trim();
                        Log.Write("dsh web url ready");
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Error("dsh web read", ex);
            }
        });
    }

    public void Dispose()
    {
        try
        {
            if (_process is { HasExited: false }) _process.Kill(entireProcessTree: true);
        }
        catch { }
        _process?.Dispose();
    }
}
