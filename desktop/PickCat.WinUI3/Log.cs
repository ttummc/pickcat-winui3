using System;
using System.IO;

namespace PickCat.WinUI3;

/// <summary>
/// Minimal crash log. An unpackaged WinUI 3 app has no console and swallows
/// exceptions inside the XAML dispatcher, so anything thrown during startup is
/// otherwise invisible.
///
/// Writes next to the executable: %LOCALAPPDATA% is not always resolvable, and a
/// silently failing log is worse than no log at all.
/// </summary>
internal static class Log
{
    private static readonly string Folder = ResolveFolder();

    public static string FilePath => Path.Combine(Folder, "startup.log");

    private static string ResolveFolder()
    {
        // Keep runtime data out of the install directory: Windows Installer only
        // removes files it tracked, and a leftover log would leave the folder behind.
        var perUser = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "PickCatWinUI3", "logs");
        try
        {
            Directory.CreateDirectory(perUser);
            return perUser;
        }
        catch
        {
            // Restricted environment: fall back next to the executable.
        }

        var appFolder = Path.Combine(AppContext.BaseDirectory, "logs");
        try
        {
            Directory.CreateDirectory(appFolder);
            return appFolder;
        }
        catch
        {
            return Path.GetTempPath();
        }
    }

    public static void Write(string message)
    {
        try
        {
            File.AppendAllText(
                FilePath,
                $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}{Environment.NewLine}");
        }
        catch
        {
            // Logging must never be the thing that crashes the app.
        }
    }

    public static void Error(string where, Exception ex) =>
        Write($"ERROR {where}: {ex.GetType().Name}: {ex.Message}{Environment.NewLine}{ex.StackTrace}");
}
