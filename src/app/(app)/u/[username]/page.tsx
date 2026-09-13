import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Grid3x3, Lock, MessageCircle, Settings, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { getProfileByUsername, getProfileStats, getProfilePosts } from "@/lib/data/profiles";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { PostGrid } from "@/components/post/PostGrid";
import { HighlightsRow } from "@/components/story/HighlightsRow";
import { getHighlights } from "@/lib/data/stories";

export async function generateMetadata(props: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const profile = await getProfileByUsername(username);
  return { title: profile ? `${profile.full_name} (@${profile.username})` : "Profile" };
}

export default async function ProfilePage(props: PageProps<"/u/[username]">) {
  const { username } = await props.params;
  const [me, profile] = await Promise.all([requireProfile(), getProfileByUsername(username)]);
  if (!profile) notFound(); // also what someone who blocked you sees

  const isMe = me.id === profile.id;
  const stats = await getProfileStats(profile.id, me.id);
  const blockedByMe = stats.blockStatus === "by_me" || stats.blockStatus === "both";

  // Everyone's account is private: content only for approved followers (or yourself).
  // The admin moderates from the admin panel, not by peeking here.
  const canSee = isMe || (stats.isFollowing && !blockedByMe);
  const [posts, highlights] = canSee
    ? await Promise.all([getProfilePosts(profile.id), getHighlights(profile.id)])
    : [[], []];

  const followState = stats.isFollowing ? "following" : stats.requested ? "requested" : "none";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <section className="px-4 pt-5 pb-4 sm:px-6 sm:pt-8">
        <div className="flex items-start gap-5 sm:gap-10">
          <span className="sm:hidden">
            <Avatar path={profile.avatar_path} name={profile.full_name} size={86} />
          </span>
          <span className="hidden sm:block">
            <Avatar path={profile.avatar_path} name={profile.full_name} size={140} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="truncate text-xl font-semibold sm:text-2xl">{profile.username}</h1>
              {profile.is_admin && (
                <span title="Admin" className="text-brand">
                  <ShieldCheck className="size-5" />
                </span>
              )}
              {isMe ? (
                <Link href="/settings" className="btn-secondary px-3 py-1.5 text-sm">
                  <Settings className="size-4" /> Edit profile
                </Link>
              ) : blockedByMe ? (
                <span className="rounded-full bg-danger-soft px-3 py-1 text-sm font-medium text-danger">Blocked</span>
              ) : (
                <div className="flex items-center gap-2">
                  <FollowButton targetId={profile.id} initialState={followState} size="sm" />
                  <Link href={`/messages/with/${profile.id}`} className="btn-secondary px-3 py-1.5 text-sm">
                    <MessageCircle className="size-4" /> Message
                  </Link>
                </div>
              )}
              {!isMe && (
                <ProfileMenu
                  targetId={profile.id}
                  username={profile.username}
                  blockedByMe={blockedByMe}
                  followsMe={stats.followsMe}
                />
              )}
            </div>

            <dl className="mt-4 flex gap-6 text-[15px]">
              <div>
                <dt className="sr-only">Posts</dt>
                <dd>
                  <strong>{stats.posts}</strong> <span className="text-ink-muted">posts</span>
                </dd>
              </div>
              {canSee ? (
                <>
                  <Link href={`/u/${profile.username}/followers`} className="hover:underline">
                    <strong>{stats.followers}</strong> <span className="text-ink-muted">followers</span>
                  </Link>
                  <Link href={`/u/${profile.username}/following`} className="hover:underline">
                    <strong>{stats.following}</strong> <span className="text-ink-muted">following</span>
                  </Link>
                </>
              ) : (
                <>
                  <span>
                    <strong>{stats.followers}</strong> <span className="text-ink-muted">followers</span>
                  </span>
                  <span>
                    <strong>{stats.following}</strong> <span className="text-ink-muted">following</span>
                  </span>
                </>
              )}
            </dl>

            <div className="mt-3 hidden sm:block">
              <p className="font-semibold">{profile.full_name}</p>
              {profile.bio && <p className="whitespace-pre-wrap text-[15px]">{profile.bio}</p>}
              {!isMe && stats.followsMe && <p className="mt-1 text-xs text-ink-faint">Follows you</p>}
              {!isMe && stats.requestedMe && (
                <Link href="/activity" className="mt-1 block text-xs text-brand hover:underline">
                  Wants to follow you — respond in Activity
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 sm:hidden">
          <p className="font-semibold">{profile.full_name}</p>
          {profile.bio && <p className="whitespace-pre-wrap text-[15px]">{profile.bio}</p>}
          {!isMe && stats.followsMe && <p className="mt-1 text-xs text-ink-faint">Follows you</p>}
          {!isMe && stats.requestedMe && (
            <Link href="/activity" className="mt-1 block text-xs text-brand hover:underline">
              Wants to follow you — respond in Activity
            </Link>
          )}
        </div>
      </section>

      {canSee ? (
        <>
          <HighlightsRow highlights={highlights} ownerId={profile.id} isOwner={isMe} />

          <section className="border-t border-line">
            <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-widest text-ink-muted uppercase">
              <Grid3x3 className="size-4" /> Posts
            </div>
            {posts.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="font-display text-lg font-semibold">No posts yet</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {isMe ? "Share your first photo — posts stay up for 30 days." : "Nothing here right now."}
                </p>
                {isMe && (
                  <Link href="/new" className="btn-primary mt-5">
                    Create a post
                  </Link>
                )}
              </div>
            ) : (
              <PostGrid posts={posts} />
            )}
          </section>
        </>
      ) : (
        <section className="border-t border-line px-6 py-16 text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full border-2 border-line text-ink-muted">
            <Lock className="size-6" />
          </span>
          <p className="font-display text-lg font-semibold">This account is private</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
            {blockedByMe
              ? "You've blocked this member."
              : followState === "requested"
                ? "Your follow request is pending. Once they accept, you'll see their photos and stories here."
                : "Follow to see their photos and stories. They'll get a request to approve."}
          </p>
        </section>
      )}
    </div>
  );
}
