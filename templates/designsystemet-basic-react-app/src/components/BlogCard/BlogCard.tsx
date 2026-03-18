/**
 * @file src/components/BlogCard.tsx
 * @description BlogCard component for displaying blog posts.
 * @author [@helpers-no]
 */

import {
  Card,
  CardBlock,
  Heading,
  Paragraph,
} from '@digdir/designsystemet-react';
import '@digdir/designsystemet-css/index.css';
import '@digdir/designsystemet-theme';
import classes from './BlogCard.module.css';

import { BlogCardProps } from '../../types/BlogPost';

export const BlogCard = ({ post }: BlogCardProps) => {
  return (
    <Card className={classes.card} data-color='neutral'>
      <CardBlock>
        <img src={post.imageUrl} alt='' className={classes.image} />
      </CardBlock>
      <CardBlock>
        <Heading level={3} data-size='sm'>
          {post.title}
        </Heading>
        <Paragraph data-size='sm'>{post.excerpt}</Paragraph>
        <Paragraph data-size='xs' className={classes.meta}>
          <span>{post.date}</span>
          <span aria-hidden className={classes.metaSquare} />
          <span>{post.author}</span>
        </Paragraph>
      </CardBlock>
    </Card>
  );
};

export default BlogCard;