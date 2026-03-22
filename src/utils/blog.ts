import type { CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

export function getPublishedPosts(posts: BlogPost[]): BlogPost[] {
	return posts
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function getLatestPosts(
	posts: BlogPost[],
	limit: number,
): BlogPost[] {
	return posts.slice(0, limit);
}

export function getLatestPost(posts: BlogPost[]): BlogPost | undefined {
	return posts[0];
}

export function getLatestPostHref(posts: BlogPost[]): string {
	const latestPost = getLatestPost(posts);
	return latestPost ? `/blog/${latestPost.id}/` : "/blog";
}

export function getTagCounts(posts: BlogPost[]): Map<string, number> {
	const tagCounts = new Map<string, number>();

	for (const post of posts) {
		for (const tag of post.data.tags ?? []) {
			tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
		}
	}

	return tagCounts;
}

export function getTopTags(posts: BlogPost[], limit: number): string[] {
	return Array.from(getTagCounts(posts).entries())
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, limit)
		.map(([tag]) => tag);
}

export function getAllTags(posts: BlogPost[]): string[] {
	const tagSet = new Set<string>();

	for (const post of posts) {
		for (const tag of post.data.tags ?? []) {
			tagSet.add(tag);
		}
	}

	return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

export function sortPosts(
	posts: BlogPost[],
	mode: "new" | "old" | "az" | "za" = "new",
): BlogPost[] {
	const sorted = [...posts];

	sorted.sort((a, b) => {
		if (mode === "new") {
			return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
		}

		if (mode === "old") {
			return a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
		}

		if (mode === "az") {
			return a.data.title.localeCompare(b.data.title);
		}

		return b.data.title.localeCompare(a.data.title);
	});

	return sorted;
}

export function filterPosts(
	posts: BlogPost[],
	options?: {
		query?: string;
		tag?: string;
	},
): BlogPost[] {
	const query = (options?.query ?? "").toLowerCase().trim();
	const tag = (options?.tag ?? "").toLowerCase().trim();

	return posts.filter((post) => {
		const title = (post.data.title ?? "").toLowerCase();
		const description = (post.data.description ?? "").toLowerCase();
		const tags = (post.data.tags ?? []).map((t) => t.toLowerCase());

		const matchesQuery =
			!query ||
			title.includes(query) ||
			description.includes(query);

		const matchesTag = !tag || tags.includes(tag);

		return matchesQuery && matchesTag;
	});
}