import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data/session";
import { getPost, getComments } from "@/lib/data/posts";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostCard } from "@/components/post/PostCard";
import { Comments } from "@/components/post/Comments";

export async function generateMetadata(props: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const post = await getPost(id);
  return { title: post ? `Post by @${post.author.username}` : "Post" };
}

export default async function PostPage(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  const [me, post] = await Promise.all([requireProfile(), getPost(id)]);
  if (!post) notFound();
  const comments = await getComments(post.id);

  const viewer = {
    id: me.id,
    isAdmin: me.is_admin,
    username: me.username,
    full_name: me.full_name,
    avatar_path: me.avatar_path,
  };

  return (
    <div className="mx-auto max-w-[520px]">
      <PageHeader title="Post" subtitle={`@${post.author.username}`} back={`/u/${post.author.username}`} />
      <div className="sm:px-4 sm:py-4">
        <PostCard post={post} viewer={viewer} detail deleteRedirect={`/u/${post.author.username}`}>
          <Comments postId={post.id} postAuthorId={post.author_id} initialComments={comments} viewer={viewer} />
        </PostCard>
      </div>
    </div>
  );
}
