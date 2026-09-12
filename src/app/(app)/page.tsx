import Link from "next/link";
import { Camera, Search } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { getFollowingIds } from "@/lib/data/profiles";
import { getFeedPage } from "@/lib/data/posts";
import { getStoryFeed } from "@/lib/data/stories";
import { FeedList } from "@/components/post/FeedList";
import { StoryBar } from "@/components/story/StoryBar";

export default async function HomePage() {
  const me = await requireProfile();
  const following = await getFollowingIds(me.id);
  const [{ posts, nextCursor }, stories] = await Promise.all([
    getFeedPage(me.id, following),
    getStoryFeed(me.id, following),
  ]);

  return (
    <div className="mx-auto max-w-[520px] sm:px-4 sm:py-4">
      <StoryBar groups={stories} me={me} />

      {posts.length === 0 ? (
        <div className="card mx-4 mt-2 px-6 py-14 text-center sm:mx-0">
          <p className="font-display text-xl font-semibold">Your feed is quiet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-ink-muted">
            {following.length === 0
              ? "Follow a few people to see their posts here, or share the first one yourself."
              : "The people you follow haven't posted lately. Be the first."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/explore" className="btn-secondary">
              <Search className="size-4" /> Find people
            </Link>
            <Link href="/new" className="btn-primary">
              <Camera className="size-4" /> Create a post
            </Link>
          </div>
        </div>
      ) : (
        <FeedList
          initialPosts={posts}
          initialCursor={nextCursor}
          viewer={{ id: me.id, isAdmin: me.is_admin }}
        />
      )}
    </div>
  );
}
