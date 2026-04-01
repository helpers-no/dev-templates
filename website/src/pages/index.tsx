import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HeroAnimation from '@site/src/components/HeroAnimation';
import CategoryGrid from '@site/src/components/CategoryGrid';
import TemplateGrid from '@site/src/components/TemplateGrid';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const logoUrl = useBaseUrl('/img/logo.svg');
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className={clsx('container', styles.heroContainer)}>
        <div className={styles.heroAnimation}>
          <HeroAnimation />
        </div>
        <div className={styles.heroContent}>
          <img src={logoUrl} alt="Dev Templates logo" className={styles.heroLogo} />
          <h1 className={clsx('hero__title', styles.heroTitle)}>{siteConfig.title}</h1>
          <p className="hero__subtitle">Instant-start templates<br />for any service, any language</p>
          <div className={styles.buttons}>
            <Link
              className="button button--lg button--primary"
              to="/docs/">
              Get Started
            </Link>
            <Link
              className="button button--lg button--secondary"
              to="/templates">
              Browse Templates
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <div className="container" style={{padding: '2rem 0'}}>
          <h2>Categories</h2>
          <CategoryGrid />
          <h2>All Templates</h2>
          <TemplateGrid />
        </div>
      </main>
    </Layout>
  );
}
