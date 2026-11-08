using System;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace PickCat.WinUI3.Dsh;

/// <summary>
/// Hosts the kernel's own web UI in a top-level window.
///
/// It cannot live in a frame inside our page: the page is served from
/// pickcat.dao3.fun, so a loopback frame is a third-party context and Chromium drops
/// its cookies, which makes the app reject the session. A separate window is
/// first-party, so everything works — model pickers, permissions, plans, diffs,
/// attachments and slash commands all come for free.
/// </summary>
public sealed partial class DshWindow : Window
{
    public DshWindow(string url)
    {
        InitializeComponent();
        Title = "DeepSeek Harness";
        try
        {
            AppWindow.Resize(new Windows.Graphics.SizeInt32(1180, 820));
        }
        catch { }

        RootGrid.Loaded += async (_, _) =>
        {
            try
            {
                await Browser.EnsureCoreWebView2Async();
                Browser.CoreWebView2.Navigate(url);
                Log.Write("dsh window opened");
            }
            catch (Exception ex)
            {
                Log.Error("dsh window", ex);
            }
        };
    }
}
