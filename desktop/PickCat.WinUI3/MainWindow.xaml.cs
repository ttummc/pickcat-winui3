using Microsoft.UI;
using Microsoft.UI.Input;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Windows.Graphics;

namespace PickCat.WinUI3;

public sealed partial class MainWindow : Window
{
    private const string StartUrl = "https://pickcat.dao3.fun/";

    // Must match the web UI's title bar: 48 CSS px tall, three 46 px caption buttons.
    private const double TitleBarHeightCss = 48;
    private const double CaptionButtonWidthCss = 46;

    private readonly AppWindow _appWindow;
    private bool _browserStarted;

    public MainWindow()
    {
        Log.Write("MainWindow ctor: begin");
        InitializeComponent();
        Log.Write("InitializeComponent ok");

        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(this);
        var windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(hwnd);
        _appWindow = AppWindow.GetFromWindowId(windowId);
        Log.Write($"AppWindow ok: {windowId.Value}");

        Try(() => ExtendsContentIntoTitleBar = true, "ExtendsContentIntoTitleBar");
        Try(() => _appWindow.Resize(new SizeInt32(1360, 900)), "Resize");

        var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "app.ico");
        if (File.Exists(iconPath)) Try(() => _appWindow.SetIcon(iconPath), "SetIcon");

        // Caption regions need the window to exist and the XamlRoot to be ready, so this
        // waits for the first layout pass instead of running in the constructor.
        RootGrid.Loaded += async (_, _) =>
        {
            Log.Write("RootGrid.Loaded");
            ApplyCaptionRegions();
            // WebView2 must be initialised only after the control is in the visual
            // tree, otherwise CoreWebView2 stays null even though Ensure* completes.
            if (!_browserStarted)
            {
                _browserStarted = true;
                await SafeInitializeBrowserAsync();
            }
        };
        RootGrid.SizeChanged += (_, _) => ApplyCaptionRegions();

        Log.Write("MainWindow ctor: end");
    }

    /// <summary>
    /// ExtendsContentIntoTitleBar makes WinUI draw its own caption buttons over our
    /// content, which doubled every glyph (our drawn one plus the native one).
    /// Painting them fully transparent keeps the native behaviour - clicks, hover
    /// regions, snap layouts - while leaving only our drawing visible.
    /// </summary>
    private void HideSystemCaptionButtons()
    {
        var bar = _appWindow.TitleBar;
        var clear = Microsoft.UI.Colors.Transparent;
        bar.ButtonBackgroundColor = clear;
        bar.ButtonInactiveBackgroundColor = clear;
        bar.ButtonHoverBackgroundColor = clear;
        bar.ButtonPressedBackgroundColor = clear;
        bar.ButtonForegroundColor = clear;
        bar.ButtonInactiveForegroundColor = clear;
        bar.ButtonHoverForegroundColor = clear;
        bar.ButtonPressedForegroundColor = clear;
        bar.BackgroundColor = clear;
        bar.InactiveBackgroundColor = clear;
    }

    private static void Try(Action action, string where)
    {
        try
        {
            action();
            Log.Write($"ok: {where}");
        }
        catch (Exception ex)
        {
            Log.Error(where, ex);
        }
    }

    // ------------------------------------------------------------------ window chrome

    private void ApplyCaptionRegions()
    {
        try
        {
            var scale = RootGrid.XamlRoot?.RasterizationScale ?? 1.0;
            var width = (int)Math.Round(RootGrid.ActualWidth * scale);
            var height = (int)Math.Round(TitleBarHeightCss * scale);
            var buttonWidth = (int)Math.Round(CaptionButtonWidthCss * scale);
            if (width <= 0 || height <= 0) return;

            var buttonsWidth = buttonWidth * 3;
            var source = InputNonClientPointerSource.GetForWindowId(_appWindow.Id);

            // Only the drag strip: the three caption buttons are drawn and handled by
            // Windows. Registering them here as well duplicated every glyph.
            source.SetRegionRects(NonClientRegionKind.Caption,
                new[] { new RectInt32(0, 0, Math.Max(0, width - buttonsWidth), height) });
        }
        catch (Exception ex)
        {
            Log.Error("ApplyCaptionRegions", ex);
        }
    }

    // ------------------------------------------------------------------ browser host

    private async Task SafeInitializeBrowserAsync()
    {
        try
        {
            await InitializeBrowserAsync();
        }
        catch (Exception ex)
        {
            Log.Error("InitializeBrowserAsync", ex);
        }
    }

    private async Task InitializeBrowserAsync()
    {
        var userDataFolder = ResolveUserDataFolder();
        Log.Write($"user data folder: {userDataFolder}");

        // WebView2 honours this when it builds its environment implicitly, which is the
        // only overload this WinUI wrapper exposes. Must be set before initialisation.
        Environment.SetEnvironmentVariable("WEBVIEW2_USER_DATA_FOLDER", userDataFolder);

        // The control can report completion while its CoreWebView2 property is still
        // null, so drive the rest from the event rather than from the await result.
        var ready = new TaskCompletionSource<CoreWebView2>();
        Browser.CoreWebView2Initialized += (sender, args) =>
        {
            if (args.Exception is not null) ready.TrySetException(args.Exception);
            else if (sender.CoreWebView2 is { } coreFromEvent) ready.TrySetResult(coreFromEvent);
        };
        if (Browser.CoreWebView2 is { } already)
        {
            ready.TrySetResult(already);
        }
        else
        {
            Log.Write("EnsureCoreWebView2Async: begin");
            await Browser.EnsureCoreWebView2Async();
            Log.Write("EnsureCoreWebView2Async: returned");
        }

        var core = await ready.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Log.Write("CoreWebView2 ready");
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;

        // Stands in for the extension's declarativeNetRequest rule: the site's own Nuxt
        // bundle is blocked so it never boots and never fights our UI for the DOM.
        core.AddWebResourceRequestedFilter(
            "*://pickcat.dao3.fun/_nuxt/*",
            CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += OnResourceRequested;

        Log.Write("reading assets");
        var css = await ReadAssetAsync("Assets/content.css");
        var js = await ReadAssetAsync("Assets/content.js");
        Log.Write($"assets read: css={css.Length} js={js.Length}");

        // Large scripts are the slow part of this call; log around it so a hang here
        // is visible instead of leaving the window blank with no explanation.
        await core.AddScriptToExecuteOnDocumentCreatedAsync(BuildStyleScript(css + "\n" + HideWebCaptionCss));
        Log.Write("style script registered");
        await core.AddScriptToExecuteOnDocumentCreatedAsync(js);
        Log.Write("content script registered");
        core.WebMessageReceived += OnWebMessage;
        Closed += (_, _) => Log.Write("window closed");
        StartRendererWatchdog(core);

        // The rewritten UI has a login page, but sign-in is the one flow that should
        // look exactly like the official site. Hash-only navigation never raises an
        // event, so poll the route and divert it.
        StartRouteWatcher();

        core.NavigationCompleted += (_, e) =>
            Log.Write($"NavigationCompleted ok={e.IsSuccess} status={e.WebErrorStatus}");
        core.ProcessFailed += (_, e) => Log.Write($"ProcessFailed: {e.ProcessFailedKind}");

        Log.Write("navigating");
        Browser.Source = new Uri(StartUrl);
        Log.Write("navigate requested");
    }

    private void OnResourceRequested(CoreWebView2 sender, CoreWebView2WebResourceRequestedEventArgs args)
    {
        args.Response = sender.Environment.CreateWebResourceResponse(
            null, 404, "Blocked", "Access-Control-Allow-Origin: *");
    }

    // A hash-only route change never raises NavigationStarting, so the page tells us
    // where it is and the host decides which routes belong to the stock site.
    // The desktop window uses the real Windows caption buttons, so the web UI's own
    // three must not be drawn or they appear twice.
    private const string HideWebCaptionCss = """
        .win-titlebar-caption-button { display: none !important; }
        """;

    private const string RouteReporterScript = """
        (function () {
          function report() {
            try { window.chrome.webview.postMessage({ type: 'pc:route', hash: location.hash }); }
            catch (e) { }
          }
          window.addEventListener('hashchange', report);
          window.addEventListener('DOMContentLoaded', report);
          setTimeout(report, 1200);
          setTimeout(report, 3000);
        })();
        """;

    private static string BuildStyleScript(string css)
    {
        var payload = JsonSerializer.Serialize(css);
        return $$"""
            (function () {
              function apply() {
                if (!document.documentElement || document.getElementById('pc-host-style')) return;
                var style = document.createElement('style');
                style.id = 'pc-host-style';
                style.textContent = {{payload}};
                document.documentElement.appendChild(style);
              }
              apply();
              document.addEventListener('DOMContentLoaded', apply);
            })();
            """;
    }

    /// <summary>
    /// Pings the page every two seconds. If the renderer stops answering, the log
    /// says so — otherwise a frozen window leaves no evidence at all.
    /// </summary>
    private void StartRendererWatchdog(CoreWebView2 core)
    {
        var timer = DispatcherQueue.CreateTimer();
        timer.Interval = TimeSpan.FromSeconds(2);
        var hung = false;

        timer.Tick += async (_, _) =>
        {
            try
            {
                var probe = core.ExecuteScriptAsync("1").AsTask();
                var finished = await Task.WhenAny(probe, Task.Delay(1500));
                if (finished != probe)
                {
                    if (!hung)
                    {
                        hung = true;
                        Log.Write("renderer unresponsive");
                    }
                    return;
                }
                if (hung)
                {
                    hung = false;
                    Log.Write("renderer responsive again");
                }
            }
            catch (Exception ex)
            {
                Log.Error("renderer watchdog", ex);
            }
        };
        timer.Start();
        Log.Write("renderer watchdog started");
    }

    private Microsoft.UI.Dispatching.DispatcherQueueTimer? _routeTimer;
    private bool _diverting;

    private void StartRouteWatcher()
    {
        _routeTimer?.Stop();
        _routeTimer = DispatcherQueue.CreateTimer();
        _routeTimer.Interval = TimeSpan.FromMilliseconds(400);
        _routeTimer.Tick += async (_, _) =>
        {
            if (_diverting || Browser.CoreWebView2 is null) return;
            try
            {
                var raw = await Browser.CoreWebView2.ExecuteScriptAsync("location.hash");
                var hash = (raw ?? string.Empty).Trim('"');
                if (!hash.Contains("/login", StringComparison.OrdinalIgnoreCase)) return;

                _diverting = true;
                Log.Write($"route {hash} -> stock login");
                await Browser.CoreWebView2.ExecuteScriptAsync(
                    "history.length > 1 ? history.back() : location.replace('/#/')");
                OpenStockLogin();
            }
            catch (Exception ex)
            {
                Log.Error("route watcher", ex);
            }
            finally
            {
                await Task.Delay(700);
                _diverting = false;
            }
        };
        _routeTimer.Start();
        Log.Write("route watcher started");
    }

    private LoginWindow? _loginWindow;

    private void OnNavigationStarting(CoreWebView2 sender, CoreWebView2NavigationStartingEventArgs args)
    {
        var url = args.Uri ?? string.Empty;
        Log.Write($"navigation starting: {url}");
        if (!url.Contains("#/login", StringComparison.OrdinalIgnoreCase)) return;

        Log.Write($"diverting to stock login: {url}");
        args.Cancel = true;
        OpenStockLogin();
    }

    private void OpenStockLogin()
    {
        if (_loginWindow is not null)
        {
            _loginWindow.Activate();
            return;
        }

        _loginWindow = new LoginWindow();
        _loginWindow.SignedIn += (_, _) => ReloadAfterLogin();
        _loginWindow.Closed += (_, _) => _loginWindow = null;
        _loginWindow.Activate();
    }

    private void ReloadAfterLogin()
    {
        try
        {
            Browser.CoreWebView2?.ExecuteScriptAsync("location.replace('/#/')");
        }
        catch (Exception ex)
        {
            Log.Error("ReloadAfterLogin", ex);
        }
    }

    private void OnWebMessage(CoreWebView2 sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        try
        {
            using var doc = JsonDocument.Parse(args.WebMessageAsJson);
            if (!doc.RootElement.TryGetProperty("type", out var type)) return;

            if (type.GetString() != "pc:capp") return;

            var action = doc.RootElement.TryGetProperty("action", out var a) ? a.GetString() : null;
            if (_appWindow.Presenter is not OverlappedPresenter presenter) return;

            switch (action)
            {
                case "minimize":
                    presenter.Minimize();
                    break;
                case "maximize":
                    if (presenter.State == OverlappedPresenterState.Maximized) presenter.Restore();
                    else presenter.Maximize();
                    break;
                case "close":
                    Close();
                    break;
                case "login":
                    OpenStockLogin();
                    break;
            }
        }
        catch (Exception ex)
        {
            Log.Error("OnWebMessage", ex);
        }
    }

    /// <summary>
    /// WebView2 needs a writable profile folder. A stale instance can keep the
    /// previous one locked, so fall back rather than dying on start-up.
    /// </summary>
    private static string ResolveUserDataFolder()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PickCatWinUI3", "WebView2"),
            // Portable / restricted-environment fallback: the install folder is
            // per-user, so it is writable in practice.
            Path.Combine(AppContext.BaseDirectory, "data", "WebView2"),
            Path.Combine(Path.GetTempPath(), "PickCatWinUI3", "WebView2"),
        };

        foreach (var candidate in candidates)
        {
            try
            {
                Directory.CreateDirectory(candidate);
                return candidate;
            }
            catch (Exception ex)
            {
                Log.Error($"ResolveUserDataFolder({candidate})", ex);
            }
        }

        throw new InvalidOperationException("no writable WebView2 user data folder");
    }

    private static async Task<string> ReadAssetAsync(string relativePath)
    {
        var path = Path.Combine(AppContext.BaseDirectory, relativePath);
        return await File.ReadAllTextAsync(path);
    }
}
