using System;
using System.Collections.Generic;
using System.IO;
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
