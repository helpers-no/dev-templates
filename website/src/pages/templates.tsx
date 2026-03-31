import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CategoryGrid from '../components/CategoryGrid';
import TemplateGrid from '../components/TemplateGrid';

export default function TemplatesPage(): ReactNode {
  return (
    <Layout
      title="Templates"
      description="Project templates for the Urbalurba developer platform">
      <header style={{padding: '2rem 0', textAlign: 'center'}}>
        <div className="container">
          <Heading as="h1">Templates</Heading>
          <p>
            Project templates for the Urbalurba developer platform.
            Each template provides a working starting point for a specific language or framework.
          </p>
        </div>
      </header>
      <main>
        <div className="container" style={{paddingBottom: '2rem'}}>
          <Heading as="h2">Categories</Heading>
          <CategoryGrid />
          <Heading as="h2">All Templates</Heading>
          <TemplateGrid />
        </div>
      </main>
    </Layout>
  );
}
