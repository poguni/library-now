import styles from './App.module.css';

// M0 임시 화면: 테마 토큰과 배포 확인용. M1에서 3단 배치로 바뀝니다.
export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <span className={styles.logo} aria-hidden="true">
          책
        </span>
        <span className={styles.brand}>
          <b>지금 열린 도서관</b>
          <span>LIBRARY NOW</span>
        </span>
      </header>
      <main className={styles.body}>
        <p>지도와 도서관 목록을 준비하고 있습니다.</p>
      </main>
    </div>
  );
}
