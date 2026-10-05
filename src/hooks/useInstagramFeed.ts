import { useState, useEffect } from 'react';

export interface IGPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp?: string;
}

type Raw = Record<string, any>;

// Instagram Graph API item -> IGPost (videos use their thumbnail)
function fromGraph(p: Raw): IGPost | null {
  const url = p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url;
  return url && p.permalink ? { id: String(p.id), media_type: p.media_type, media_url: url, permalink: p.permalink, timestamp: p.timestamp } : null;
}

// Behold.so JSON feed item -> IGPost
function fromFeed(p: Raw): IGPost | null {
  const url = p.sizes?.medium?.mediaUrl || (p.mediaType === 'VIDEO' ? p.thumbnailUrl : p.mediaUrl) || p.thumbnailUrl;
  return url && p.permalink ? { id: String(p.id), media_type: p.mediaType ?? 'IMAGE', media_url: url, permalink: p.permalink, timestamp: p.timestamp } : null;
}

export function useInstagramFeed(count = 6) {
  const [posts, setPosts] = useState<IGPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const feedUrl = import.meta.env.VITE_INSTAGRAM_FEED_URL;
    const token = import.meta.env.VITE_INSTAGRAM_TOKEN;
    if (!feedUrl && !token) { setLoading(false); return; }

    const request = feedUrl
      ? fetch(feedUrl).then(r => r.json()).then(d =>
          (Array.isArray(d.posts) ? d.posts : []).map(fromFeed))
      : fetch(
          `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${count + 6}&access_token=${token}`
        ).then(r => r.json()).then(d => (Array.isArray(d.data) ? d.data : []).map(fromGraph));

    request
      .then((list: (IGPost | null)[]) => {
        const time = (p: IGPost) => (p.timestamp ? Date.parse(p.timestamp) || 0 : 0);
        const sorted = list
          .filter((p): p is IGPost => p !== null)
          .sort((a, b) => time(b) - time(a)); // newest first, regardless of feed order
        setPosts(sorted.slice(0, count));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [count]);

  return { posts, loading };
}
