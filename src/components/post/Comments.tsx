"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";
import type { CommentItem, PostAuthor } from "@/lib/data/posts";
import type { Viewer } from "@/components/post/PostCard";

type Props = {
  postId: string;
  postAuthorId: string;
  initialComments: CommentItem[];
  viewer: Viewer & PostAuthor;
};

export function Comments({ postId, postAuthorId, initialComments, viewer }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: viewer.id, body: text })
      .select("id, post_id, author_id, body, created_at")
      .single();
    setSending(false);
    if (err || !data) return setError("Couldn't post your comment.");
    setComments((c) => [
      ...c,
      { ...data, author: { id: viewer.id, username: viewer.username, full_name: viewer.full_name, avatar_path: viewer.avatar_path } },
    ]);
    setBody("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this comment?")) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("comments").delete().eq("id", id);
    if (err) return alert("Couldn't delete the comment.");
    setComments((c) => c.filter((x) => x.id !== id));
    router.refresh();
  }

  return (
    <div className="border-t border-line">
      <ul className="max-h-[50vh] divide-y divide-line/60 overflow-y-auto md:max-h-none">
        {comments.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-ink-muted">No comments yet. Say something nice.</li>
        )}
        {comments.map((c) => {
          const canDelete = c.author_id === viewer.id || postAuthorId === viewer.id || viewer.isAdmin;
          return (
            <li key={c.id} className="group flex gap-3 px-4 py-3">
              <Link href={`/u/${c.author.username}`} className="shrink-0">
                <Avatar path={c.author.avatar_path} name={c.author.full_name} size={32} />
              </Link>
              <div className="min-w-0 flex-1 text-[15px]">
                <p className="whitespace-pre-wrap break-words">
                  <Link href={`/u/${c.author.username}`} className="mr-1.5 font-semibold">
                    {c.author.username}
                  </Link>
                  {c.body}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">{timeAgo(c.created_at)}</p>
              </div>
              {canDelete && (
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => remove(c.id)}
                  className="self-start rounded-full p-1 text-ink-faint opacity-0 transition hover:text-danger group-hover:opacity-100 focus:opacity-100 max-md:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-3 py-2">
        <Avatar path={viewer.avatar_path} name={viewer.full_name} size={30} />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          placeholder="Add a comment…"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label="Post comment"
          className="rounded-full p-2 text-brand disabled:opacity-40"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </form>
      {error && <p className="px-4 pb-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
