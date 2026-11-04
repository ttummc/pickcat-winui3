using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;
using System;
using System.IO;
using System.Threading.Tasks;
using Windows.Graphics;

namespace PickCat.WinUI3;

/// <summary>
/// Sign-in is deliberately the site's own page, untouched: no injected UI, no
/// blocked bundle. It shares the WebView2 profile with the main window, so the
/// session cookie written here is what the rewritten UI then uses.
/// </summary>
public sealed partial class LoginWindow : Window
{
    private const string LoginUrl = "https://pickcat.dao3.fun/login";

    private readonly AppWindow _appWindow;

    /// <summary>Raised when the official page navigates away from the login route.</summary>
    public event EventHandler? SignedIn;

    public LoginWindow()
    {
        InitializeComponent();

        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(this);
        var id = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(hwnd);
        _appWindow = AppWindow.GetFromWindowId(id);
        _appWindow.Resize(new SizeInt32(520, 760));

        var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "app.ico");
        if (File.Exists(iconPath))
        {
            try { _appWindow.SetIcon(iconPath); } catch (Exception ex) { Log.Error("LoginWindow.SetIcon", ex); }
        }

        _ = InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        try
        {
            var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PickCatWinUI3", "WebView2");
            try
            {
                Directory.CreateDirectory(folder);
            }
            catch
            {
                folder = Path.Combine(AppContext.BaseDirectory, "data", "WebView2");
                Directory.CreateDirectory(folder);
            }

            Environment.SetEnvironmentVariable("WEBVIEW2_USER_DATA_FOLDER", folder);

            await Browser.EnsureCoreWebView2Async();
            var core = Browser.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.IsStatusBarEnabled = false;

            // No resource filtering and no script injection: this is the stock site.
            core.SourceChanged += OnSourceChanged;
            Browser.Source = new Uri(LoginUrl);
            Log.Write("login window opened");
        }
        catch (Exception ex)
        {
            Log.Error("LoginWindow.InitializeAsync", ex);
        }
    }

    private void OnSourceChanged(CoreWebView2 sender, CoreWebView2SourceChangedEventArgs args)
    {
        var url = sender.Source ?? string.Empty;
        if (url.Length == 0) return;
        if (url.Contains("/login", StringComparison.OrdinalIgnoreCase)) return;

        Log.Write($"login window: signed in -> {url}");
        SignedIn?.Invoke(this, EventArgs.Empty);
        Close();
    }
}
