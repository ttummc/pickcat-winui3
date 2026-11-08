using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;

namespace PickCat.WinUI3.Dsh;

/// <summary>One conversation. Each owns a workspace folder the kernel runs inside.</summary>
internal sealed class DshChat
{
    public string Id { get; set; } = Guid.NewGuid().ToString("n")[..12];
    public string Title { get; set; } = "新对话";

    /// <summary>Session id reported by the kernel; empty until the first turn runs.</summary>
    public string KernelSession { get; set; } = "";

    public string Workspace { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}

/// <summary>
/// Chats, the model key and workspace folders, all kept under %APPDATA%\PickCat.
/// </summary>
internal static class DshStore
{
    private static readonly object Gate = new();
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    public static string Root
    {
        get
        {
            var root = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PickCat");
            Directory.CreateDirectory(root);
            return root;
        }
    }

    public static string WorkspacesRoot
    {
        get
        {
            var dir = Path.Combine(Root, "workspaces");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public static string ChatsFile => Path.Combine(Root, "chats.json");
    public static string KeyFile => Path.Combine(Root, "api-key.txt");

    public static string? ReadKey()
    {
        try
        {
            if (!File.Exists(KeyFile)) return null;
            var key = File.ReadAllText(KeyFile).Trim();
            return string.IsNullOrEmpty(key) ? null : key;
        }
        catch
        {
            return null;
        }
    }

    public static bool HasKey() => ReadKey() is not null;

    public static void WriteKey(string key)
    {
        var value = key.Trim();
        if (value.Length == 0)
        {
            if (File.Exists(KeyFile)) File.Delete(KeyFile);
            return;
        }
        File.WriteAllText(KeyFile, value);
    }

    public static List<DshChat> LoadChats()
    {
        lock (Gate)
        {
            try
            {
                if (!File.Exists(ChatsFile)) return new List<DshChat>();
                var json = File.ReadAllText(ChatsFile);
                return JsonSerializer.Deserialize<List<DshChat>>(json, Json) ?? new List<DshChat>();
            }
            catch
            {
                return new List<DshChat>();
            }
        }
    }

    public static void SaveChats(List<DshChat> chats)
    {
        lock (Gate)
        {
            File.WriteAllText(ChatsFile, JsonSerializer.Serialize(chats, Json));
        }
    }

    public static DshChat CreateChat(string? title = null)
    {
        var chat = new DshChat
        {
            Title = string.IsNullOrWhiteSpace(title) ? "新对话" : title.Trim(),
            Workspace = Path.Combine(WorkspacesRoot, Guid.NewGuid().ToString("n")[..12]),
        };
        Directory.CreateDirectory(chat.Workspace);
        DshContext.Provision(chat.Workspace);

        var chats = LoadChats();
        chats.Insert(0, chat);
        SaveChats(chats);
        return chat;
    }

    public static DshChat? Find(string id) => LoadChats().Find(c => c.Id == id);

    public static void Update(DshChat chat)
    {
        var chats = LoadChats();
        var index = chats.FindIndex(c => c.Id == chat.Id);
        if (index < 0) return;
        chats[index] = chat;
        SaveChats(chats);
    }
}

/// <summary>User-tunable kernel options.</summary>
internal sealed class DshSettings
{
    public string PermissionMode { get; set; } = "workspace-write";
    public string Model { get; set; } = "deepseek-flash";
    public string Provider { get; set; } = "deepseek-official";
}

internal static class DshSettingsStore
{
    private static readonly JsonSerializerOptions Json = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public static string FilePath => Path.Combine(DshStore.Root, "dsh-settings.json");

    public static DshSettings Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return new DshSettings();
            return JsonSerializer.Deserialize<DshSettings>(File.ReadAllText(FilePath), Json)
                   ?? new DshSettings();
        }
        catch
        {
            return new DshSettings();
        }
    }

    public static void Save(DshSettings settings)
    {
        File.WriteAllText(FilePath, JsonSerializer.Serialize(settings, Json));
        WriteModelPatch(settings);
    }

    /// <summary>
    /// The headless profile has no --model flag, so the selection is written into the
    /// profile patch layer; dsh composes it on the next run.
    /// </summary>
    private static void WriteModelPatch(DshSettings settings)
    {
        var profile = Path.Combine(DshRunner.ResolveHome(), "profiles", "headless");
        Directory.CreateDirectory(profile);
        var yaml =
            "# Written by PickCat; rewritten whenever the model selection changes.\n" +
            "- id: agent-default-model\n" +
            "  config:\n" +
            "    provider: " + settings.Provider + "\n" +
            "    model: " + settings.Model + "\n";
        File.WriteAllText(Path.Combine(profile, "cordis.patch.yml"), yaml, new UTF8Encoding(false));
    }
}

/// <summary>
/// Copies the context pack (AGENTS.md, components.json, pages.md) into a workspace.
/// The kernel reads AGENTS.md from its working directory, so this is what tells it
/// that the project is PickCat and that the UI must use WinUIonWeb.
/// </summary>
internal static class DshContext
{
    public static string SourceDir => Path.Combine(AppContext.BaseDirectory, "Assets", "dsh-context");

    public static void Provision(string workspace)
    {
        try
        {
            if (!Directory.Exists(SourceDir)) return;
            Directory.CreateDirectory(workspace);
            foreach (var file in Directory.GetFiles(SourceDir))
            {
                var target = Path.Combine(workspace, Path.GetFileName(file));
                // Do not clobber a file the user (or the kernel) has since edited.
                if (!File.Exists(target)) File.Copy(file, target);
            }
        }
        catch (Exception ex)
        {
            Log.Error("dsh context provision", ex);
        }
    }
}