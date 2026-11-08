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
/// Local HTTP bridge between the «DSH 定制» page and the kernel.
///
/// Plain HTTP + long-poll rather than WebSocket: the renderer is a web page, so a
/// WebSocket would need a hand-rolled server, while fetch() works as-is. The token
/// travels in the query string and bodies are text/plain so no CORS preflight fires.
/// </summary>
internal sealed class DshBridge : IDisposable
{
    private readonly HttpListener _listener = new();
    private readonly ConcurrentDictionary<string, DshTask> _tasks = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _running = new();
    private readonly string _token = Guid.NewGuid().ToString("n");
    private CancellationTokenSource? _service;
    private string? _cli;
    private (string Exe, string Cli)? _launch;
    private string _home = "";
    private Func<string?>? _webUrl;
    private Action? _openWeb;

    /// <summary>Opens the kernel's web UI in its own window.</summary>
    public void BindOpenWeb(Action open) => _openWeb = open;

    /// <summary>Lets the window hand the page the URL of the kernel's own web UI.</summary>
    public void BindWebUrl(Func<string?> provider) => _webUrl = provider;

    public int Port { get; private set; }

    public bool KernelFound => _launch is not null;

    public string Token => _token;

    /// <summary>Re-runs kernel discovery; call after the payload has been unpacked.</summary>
    public void Refresh()
    {
        _cli = DshRunner.ResolveCli();
        _launch = DshRunner.ResolveLaunch();
        Log.Write($"dsh kernel refresh: {_cli ?? "(still missing)"}");
    }

    public void Start()
    {
        _home = DshRunner.ResolveHome();
        Refresh();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var port = FreePort();
            try
            {
                _listener.Prefixes.Clear();
                _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
                _listener.Start();
                Port = port;
                break;
            }
            catch (Exception ex)
            {
                Log.Write($"dsh bridge bind {port} failed: {ex.Message}");
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

            switch ((request.Url?.AbsolutePath ?? "/").TrimEnd('/'))
            {
                case "/state":
                    await WriteJson(response, 200, State());
                    return;

                case "/web":
                    await WriteJson(response, 200, new { url = _webUrl?.Invoke() });
                    return;

                case "/open-web":
                    _openWeb?.Invoke();
                    await WriteJson(response, 200, new { opened = _openWeb is not null });
                    return;

                case "/config":
                    await HandleConfig(request, response);
                    return;

                case "/chats":
                    await HandleChats(request, response, query);
                    return;

                case "/task":
                    await HandleTask(request, response, token);
                    return;

                case "/events":
                    await HandleEvents(response, query, token);
                    return;

                case "/cancel":
                    await HandleCancel(response, query);
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
        ready = KernelFound,
        hasKey = DshStore.HasKey(),
        workspaces = DshStore.WorkspacesRoot,
        kernel = new { found = KernelFound, path = _cli, home = _home },
        protocol = 2,
    };

    private async Task HandleConfig(HttpListenerRequest request, HttpListenerResponse response)
    {
        if (request.HttpMethod == "POST")
        {
            var body = await ReadBody(request);
            var key = body.ValueKind == JsonValueKind.Object && body.TryGetProperty("key", out var k)
                ? k.GetString() ?? ""
                : "";
            DshStore.WriteKey(key);
            Log.Write(key.Length == 0 ? "dsh key cleared" : "dsh key stored");
        }

        await WriteJson(response, 200, new { hasKey = DshStore.HasKey() });
    }

    private async Task HandleChats(HttpListenerRequest request, HttpListenerResponse response, string query)
    {
        switch (request.HttpMethod)
        {
            case "POST":
            {
                var body = await ReadBody(request);
                var title = body.ValueKind == JsonValueKind.Object && body.TryGetProperty("title", out var t)
                    ? t.GetString()
                    : null;
                var chat = DshStore.CreateChat(title);
                await WriteJson(response, 200, chat);
                return;
            }
            case "DELETE":
            {
                var id = Extract(query, "id");
                var chats = DshStore.LoadChats();
                chats.RemoveAll(c => c.Id == id);
                DshStore.SaveChats(chats);
                await WriteJson(response, 200, new { deleted = true });
                return;
            }
            default:
            {
                var chats = DshStore.LoadChats();
                await WriteJson(response, 200, new { chats });
                return;
            }
        }
    }

    private async Task HandleTask(HttpListenerRequest request, HttpListenerResponse response, CancellationToken token)
    {
        var body = await ReadBody(request);
        var prompt = body.TryGetProperty("prompt", out var p) ? p.GetString() ?? "" : "";
        var chatId = body.TryGetProperty("chatId", out var c) ? c.GetString() ?? "" : "";

        if (string.IsNullOrWhiteSpace(prompt))
        {
            await WriteJson(response, 400, new { error = "empty prompt" });
            return;
        }
        if (!KernelFound)
        {
            await WriteJson(response, 503, new { error = "DSH kernel not found" });
            return;
        }

        var chat = DshStore.Find(chatId) ?? DshStore.CreateChat();
        var task = new DshTask(prompt, chat.Id);
        _tasks[task.Id] = task;

        var cts = CancellationTokenSource.CreateLinkedTokenSource(token);
        _running[task.Id] = cts;

        if (chat.Title == "新对话")
        {
            chat.Title = prompt.Length > 24 ? prompt[..24] : prompt;
            chat.UpdatedAt = DateTime.Now;
            DshStore.Update(chat);
        }

        _ = Task.Run(async () =>
        {
            try
            {
                DshContext.Provision(chat.Workspace);
                await DshRunner.RunAsync(
                    _launch!.Value, _home, chat.Workspace, DshStore.ReadKey(),
                    string.IsNullOrEmpty(chat.KernelSession) ? null : chat.KernelSession,
                    task, _ => { }, cts.Token);

                if (task.KernelSession.Length > 0)
                {
                    var stored = DshStore.Find(chat.Id);
                    if (stored is not null)
                    {
                        stored.KernelSession = task.KernelSession;
                        stored.UpdatedAt = DateTime.Now;
                        DshStore.Update(stored);
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Error("dsh task", ex);
            }
            finally
            {
                _running.TryRemove(task.Id, out _);
            }
        }, token);

        await WriteJson(response, 200, new { taskId = task.Id, chatId = chat.Id });
    }

    private async Task HandleEvents(HttpListenerResponse response, string query, CancellationToken token)
    {
        var id = Extract(query, "task");
        var since = int.TryParse(Extract(query, "since"), out var s) ? s : 0;
        if (!_tasks.TryGetValue(id, out var task))
        {
            await WriteJson(response, 404, new { error = "unknown task" });
            return;
        }

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
            session = task.KernelSession,
            count = task.EventCount,
        });
    }

    private async Task HandleCancel(HttpListenerResponse response, string query)
    {
        var id = Extract(query, "task");
        if (_running.TryRemove(id, out var cts))
        {
            cts.Cancel();
            await WriteJson(response, 200, new { cancelled = true });
            return;
        }
        await WriteJson(response, 404, new { error = "unknown task" });
    }

    private void AddCors(HttpListenerResponse response, HttpListenerRequest request)
    {
        var origin = request.Headers["Origin"];
        response.Headers["Access-Control-Allow-Origin"] = string.IsNullOrEmpty(origin) ? "*" : origin;
        response.Headers["Access-Control-Allow-Headers"] = "content-type";
        response.Headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
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

    /// <summary>
    /// camelCase so the page can read `chat.id` / `chat.title` directly; the
    /// default policy would emit `Id` / `Title` and every lookup would be undefined.
    /// </summary>
    private static readonly JsonSerializerOptions Wire = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private static async Task WriteJson(HttpListenerResponse response, int status, object payload)
    {
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload, Wire));
        response.StatusCode = status;
        response.ContentType = "application/json; charset=utf-8";
        response.ContentLength64 = bytes.Length;
        await response.OutputStream.WriteAsync(bytes);
        response.Close();
    }

    public void Dispose()
    {
        try { _service?.Cancel(); } catch { }
        try { _listener.Close(); } catch { }
        foreach (var cts in _running.Values) { try { cts.Cancel(); } catch { } }
    }
}
