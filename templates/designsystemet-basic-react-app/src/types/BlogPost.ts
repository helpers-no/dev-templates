/**
 * @file src/types/BlogCard.tsx
 * @description BlogCard component for displaying blog posts.
 * @author [@helpers-no]
 */

export interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    date: string;
    imageUrl: string;
    author: string;
}

export interface BlogCardProps {
    post: BlogPost;
}