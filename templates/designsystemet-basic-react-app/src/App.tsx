/**
 * @file src/App.tsx
 * @description Main application component that renders the blog posts grid
 * @author [@helpers-no]
 */

import { Heading, Link } from '@digdir/designsystemet-react';
import '@digdir/designsystemet-css/index.css';
import '@digdir/designsystemet-theme';
import { BlogCard } from './components/BlogCard/BlogCard';
import { BlogPost } from './types/BlogPost';
import blogPostsData from './data/blog-posts.json';
import './App.css';

// Add meta information
document.documentElement.lang = 'nb';
document.documentElement.setAttribute('data-color-scheme', 'auto');

// Add Inter font
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://altinncdn.no/fonts/inter/v4.1/inter.css';
fontLink.integrity = 'sha384-OcHzc/By/OPw9uJREawUCjP2inbOGKtKb4A/I2iXxmknUfog2H8Adx71tWVZRscD';
fontLink.crossOrigin = 'anonymous';
document.head.appendChild(fontLink);

/**
 * App component that displays a grid of blog posts
 * @returns {JSX.Element} The rendered App component
 */
function App() {
  // Convert the imported JSON data to BlogPost type array
  const blogPosts: BlogPost[] = blogPostsData.blogPosts;

  return (
    <div className="app">
      <header className="app-header">
        <Heading level={1} data-size="2xl">
          Basic React App
        </Heading>
        <Heading level={2} data-size="md">
          Using <Link href="https://github.com/digdir/designsystemet" target="_blank">Digdir Designsystemet</Link>
        </Heading>
        <Heading level={3} data-size="sm">
          Urbalurba TeMPlaLE: designsystemet-basic-react-app
        </Heading>
      </header>
      <main>
        {/* Grid container for blog post cards */}
        <div className="blog-grid">
          {blogPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
