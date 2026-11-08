using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PickCat.WinUI3.Dsh;

/// <summary>
/// Local HTTP bridge between the page ("DSH 定制") and the DSH kernel.
///
/// Plain HTTP + long-poll rather than WebSocket: the renderer is a web page, so a
/// WebSocket would need a hand-rolled server, while fetch() works as-is. The token
/// travels in the query string and bodies are text/plain so the browser never sends
/// a CORS preflight.
/// </summary>
internal sealed class DshBridge : IDisposable
{
    private readonly HttpListener _listener = new();
    private readonly ConcurrentDictionary<string, DshTask> _tasks = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _running = new();
    private readonly string _token = Guid.NewGuid().ToString("n");
    private CancellationTokenSource? _service;
    private string? _cli;
    private string _home = "";

    public int Port { get; private set; }

    public bool KernelFound => _cli is not null;

    public static TaskCompletionSource<DshBridge> Started { get; } = new();

    public void Start()
    {
        _home = DshRunner.ResolveHome();
        _cli = DshRunner.ResolveCli();
        Log.Write($"dsh cli: {_cli ?? "(not found)"}");
        Log.Write($"dsh home: {_home}");

        // Port 0 asks the OS for a free port; loop the bind a few times in case of a race.
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var port = FreePort();
            var prefix = $"http://127.0.0.1:{port}/";
            try
            {
                _listener.Prefixes.Clear();
                _listener.Prefixes.Add(prefix);
                _listener.Start();
                Port = port;
                break;
            }
            catch (HttpListenerException ex)
            {
                Log.Write($"dsh bridge bind {port} failed: {ex.Message}");
            }
            catch (Exception ex)
            {
                Log.Error("dsh bridge bind", ex);
                break;
            }
        }

        if (Port == 0)
        {
            Log.Write("dsh bridge: no port available");
            return;
        }

        _service = new CancellationTokenSource();
        Log.Write($"dsh bridge listening on 127.0.0.1:{Port}");
        _ = Task.Run(() => LoopAsync(_service.Token));
        Started.TrySetResult(this);
    }

    private static int FreePort()
    {
        var probe = new TcpListener(IPAddress.Loopback, 0);
        probe.Start();
        var port = ((IPEndPoint)probe.LocalEndpoint).Port;
        probe.Stop();
        return port;
    }

    private async Task LoopAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            HttpListenerContext context;
            try
            {
                context = await _listener.GetContextAsync();
            }
            catch (Exception) when (token.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                Log.Error("dsh bridge accept", ex);
                continue;
            }

            _ = Task.Run(() => HandleAsync(context, token));
        }
    }

    private async Task HandleAsync(HttpListenerContext context, CancellationToken token)
    {
        var request = context.Request;
        var response = context.Response;
        try
        {
            // Only the extension may talk to us; the token is the real gate.
            AddCors(response, request);

            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 204;
                response.Close();
                return;
            }

            var query = request.Url?.Query ?? "";
            if (!Extract(query, "token").Equals(_token, StringComparison.Ordinal))
            {
                await WriteJson(response, 403, new { error = "forbidden" });
                return;
            }

            var path = (request.Url?.AbsolutePath ?? "/").TrimEnd('/');
            switch (path)
            {
                case "/state":
                    await WriteJson(response, 200, State());
                    return;

                case "/task":
                {
                    var body = await ReadBody(request);
                    var prompt = body.TryGetProperty("prompt", out var p) ? p.GetString() ?? "" : "";
                    if (string.IsNullOrWhiteSpace(prompt))
                    {
                        await WriteJson(response, 400, new { error = "empty prompt" });
                        return;
                    }
                    if (!KernelFound)
                    {
                        await WriteJson(response, 503, new { error = "DSH 内核未找到" });
                        return;
                    }

                    var task = new DshTask(prompt);
                    _tasks[task.Id] = task;
                    var cts = new CancellationTokenSource();
                    _running[task.Id] = cts;
                    _ = DshRunner.RunAsync(_cli!, _home, task, _ => { }, cts.Token);

                    await WriteJson(response, 200, new { taskId = task.Id });
                    return;
                }

                case "/events":
                {
                    var id = Extract(query, "task");
                    var since = int.TryParse(Extract(query, "since"), out var s) ? s : 0;
                    if (!_tasks.TryGetValue(id, out var task))
                    {
                        await WriteJson(response, 404, new { error = "unknown task" });
                        return;
                    }

                    // Long-poll: wait until there is something new or the task ends.
                    var deadline = DateTime.UtcNow.AddSeconds(25);
                    while (task.EventCount <= since && !task.Finished && DateTime.UtcNow < deadline)
                    {
                        await Task.Delay(120, token);
                    }

                    await WriteJson(response, 200, new
                    {
                        events = task.Snapshot(since),
                        finished = task.Finished,
                        failed = task.Failed,
                        final = task.FinalText,
                        count = task.EventCount,
                    });
                    return;
                }

                case "/cancel":
                {
                    var id = Extract(query, "task");
                    if (_running.TryRemove(id, out var cts))
                    {
                        cts.Cancel();
                        await WriteJson(response, 200, new { cancelled = true });
                        return;
                    }
                    await WriteJson(response, 404, new { error = "unknown task" });
                    return;
                }

                case "/tasks":
                    await WriteJson(response, 200, new { tasks = new List<object>() });
                    return;

                default:
                    await WriteJson(response, 404, new { error = "not found" });
                    return;
            }
        }
        catch (Exception ex)
        {
            Log.Error("dsh bridge request", ex);
            try { await WriteJson(response, 500, new { error = ex.Message }); } catch { }
        }
    }

    private object State() => new
    {
        ready = KernelFound && Port != 0,
        version = "1.2.3",
        kernel = new
        {
            found = KernelFound,
            path = _cli,
            home = _home,
        },
        protocol = 1,
    };

    private void AddCors(HttpListenerResponse response, HttpListenerRequest request)
    {
        var origin = request.Headers["Origin"];
        // The page runs inside the extension or the desktop webview.
        response.Headers["Access-Control-Allow-Origin"] = string.IsNullOrEmpty(origin) ? "*" : origin;
        response.Headers["Access-Control-Allow-Headers"] = "content-type";
        response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
        response.Headers["Access-Control-Max-Age"] = "600";
    }

    private static string Extract(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var eq = part.IndexOf('=');
            if (eq <= 0) continue;
            if (part[..eq] == key) return Uri.UnescapeDataString(part[(eq + 1)..]);
        }
        return "";
    }

    private static async Task<JsonElement> ReadBody(HttpListenerRequest request)
    {
        using var reader = new StreamReader(request.InputStream, Encoding.UTF8);
        var text = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(text)) return default;
        using var doc = JsonDocument.Parse(text);
        return doc.RootElement.Clone();
    }

    private static async Task WriteJson(HttpListenerResponse response, int status, object payload)
    {
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));
        response.StatusCode = status;
        response.ContentType = "application/json; charset=utf-8";
        response.ContentLength64 = bytes.Length;
        await response.OutputStream.WriteAsync(bytes);
        response.Close();
    }

    /// <summary>Token the page must append to every request.</summary>
    public string Token => _token;

    public void Dispose()
    {
        try { _service?.Cancel(); } catch { }
        try { _listener.Close(); } catch { }
        foreach (var cts in _running.Values) { try { cts.Cancel(); } catch { } }
    }
}
