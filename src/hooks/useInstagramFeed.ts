import { useState, useEffect } from 'react';

export interface IGPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
}

export function useInstagramFeed(count = 6) {
  const [posts, setPosts] = useState<IGPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = import.meta.env.VITE_INSTAGRAM_TOKEN;
    if (!token) { setLoading(false); return; }

    fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink&limit=${count}&access_token=${token}`
    )
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.data)) {
          setPosts(
            data.data
              .filter((p: IGPost) => p.media_type === 'IMAGE' || p.media_type === 'CAROUSEL_ALBUM')
              .slice(0, count)
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [count]);

  return { posts, loading };
}
