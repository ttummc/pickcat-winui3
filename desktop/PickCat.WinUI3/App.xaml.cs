using Microsoft.UI.Xaml;
using System;
using System.IO;

namespace PickCat.WinUI3;

public partial class App : Application
{
    private Window? _window;

    public App()
    {
        Log.Write("App ctor");
        UnhandledException += (_, e) =>
        {
            Log.Error("App.UnhandledException", e.Exception);
            e.Handled = false;
        };
        AppDomain.CurrentDomain.UnhandledException += (_, e) =>
            Log.Error("AppDomain", e.ExceptionObject as Exception ?? new Exception("unknown"));

        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        Log.Write("OnLaunched");
        try
        {
            _window = new MainWindow();
            _window.Activate();
            Log.Write("window activated");
        }
        catch (Exception ex)
        {
            Log.Error("OnLaunched", ex);
            throw;
        }
    }
}
