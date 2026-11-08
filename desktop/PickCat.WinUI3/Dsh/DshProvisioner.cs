using System;
using System.IO;
using System.IO.Compression;
using System.Threading.Tasks;

namespace PickCat.WinUI3.Dsh;

/// <summary>
/// Unpacks the bundled DSH kernel on first run.
///
/// The kernel is shipped as a single compressed payload instead of a thousand loose
/// files: that keeps the MSI small to build, and the extraction happens once while
/// the UI is already on screen.
/// </summary>
internal static class DshProvisioner
{
    public static string PayloadPath => Path.Combine(AppContext.BaseDirectory, "dsh", "payload.zip");

    public static string PayloadHashPath => PayloadPath + ".sha256";

    /// <summary>True when the kernel is present at the bundled location.</summary>
    public static bool IsInstalled()
    {
        var cli = Path.Combine(
            AppContext.BaseDirectory,
            "dsh", "resources", "runtime", "cli", "bin", "dsh.cmd");
        return File.Exists(cli);
    }

    /// <summary>
    /// Extracts the payload when needed. Safe to call repeatedly; returns true when a
    /// kernel is available at the end.
    /// </summary>
    public static async Task<bool> EnsureAsync()
    {
        if (IsInstalled()) return true;
        if (!File.Exists(PayloadPath))
        {
            Log.Write("dsh payload missing: " + PayloadPath);
            return false;
        }

        Log.Write($"dsh payload found: {new FileInfo(PayloadPath).Length / (1024 * 1024)} MB");
        var target = Path.Combine(AppContext.BaseDirectory, "dsh");
        var marker = Path.Combine(target, ".extracting");
        File.WriteAllText(marker, DateTime.Now.ToString("O"));

        try
        {
            await Task.Run(() => ZipFile.ExtractToDirectory(PayloadPath, target, overwriteFiles: true));
            Log.Write("dsh payload extracted");
            try { File.Delete(marker); } catch { }
            return IsInstalled();
        }
        catch (Exception ex)
        {
            Log.Error("dsh payload extract", ex);
            return false;
        }
    }
}
