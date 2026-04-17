import React from 'react';
import targets from '../../data/deployment-targets.json';
import styles from './styles.module.css';

export function DeploymentTargetCards() {
  return (
    <div className={styles.cardGrid}>
      {targets.targets.map((t) => (
        <div key={t.id} className={styles.card}>
          <div className={styles.cardName}>{t.name}</div>
          <div className={styles.cardDesc}>{t.description}</div>
          <div className={styles.cardFooter}>
            <span className={styles.cardCategory}>{t.category}</span>
            <span className={`${styles.status} ${styles[t.status.replace('-', '')]}`}>
              {t.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DeploymentTargets() {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Target</th>
          <th>Type</th>
          <th>Description</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {targets.targets.map((t) => (
          <tr key={t.id}>
            <td><strong>{t.name}</strong></td>
            <td>{t.category}</td>
            <td>{t.description}</td>
            <td>
              <span className={`${styles.status} ${styles[t.status.replace('-', '')]}`}>
                {t.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
