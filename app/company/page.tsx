import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "運営会社｜バク売れLPテンプレ",
  description: "バク売れLPテンプレの運営会社情報です。",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "28px 16px 60px",
  } as const,
  container: { maxWidth: 920, margin: "0 auto" } as const,
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 14,
    flexWrap: "wrap" as const,
  } as const,
  crumbLink: { color: "#2563eb", textDecoration: "none" } as const,
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
    padding: "26px 22px",
  } as const,
  h1: { fontSize: 28, margin: "0 0 10px", letterSpacing: "-0.02em" } as const,
  lead: { color: "#374151", margin: "0 0 18px", lineHeight: 1.9 } as const,
  section: { marginTop: 22 } as const,
  h2: { fontSize: 18, margin: "0 0 10px" } as const,
  tableCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
  } as const,
  dl: {
    display: "grid",
    gridTemplateColumns: "160px 1fr",
    rowGap: 10,
    columnGap: 16,
    margin: 0,
  } as const,
  dt: { color: "#6b7280" } as const,
  dd: { margin: 0, color: "#111827", lineHeight: 1.8 } as const,
  note: { marginTop: 10, color: "#4b5563", lineHeight: 1.9 } as const,
  btnRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    marginTop: 14,
  } as const,
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    textDecoration: "none",
    fontSize: 13,
  } as const,
  primaryBtn: {
    border: "1px solid rgba(37,99,235,0.25)",
    background: "rgba(37,99,235,0.08)",
    color: "#1d4ed8",
  } as const,
};

export default function CompanyPage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <nav aria-label="パンくず" style={styles.breadcrumb}>
          <Link href="/" style={styles.crumbLink}>
            トップ
          </Link>
          <span aria-hidden>›</span>
          <span>運営会社</span>
        </nav>

        <article style={styles.card}>
          <h1 style={styles.h1}>運営会社</h1>
          <p style={styles.lead}>本サービス「バク売れLPテンプレ」の運営会社情報です。</p>

          <section style={styles.section}>
            <h2 style={styles.h2}>会社概要</h2>

            <div style={styles.tableCard}>
              <dl style={styles.dl}>
                <dt style={styles.dt}>会社名</dt>
                <dd style={styles.dd}>株式会社CHAINSODA</dd>

                <dt style={styles.dt}>所在地</dt>
                <dd style={styles.dd}>
                  〒150-0001
                  <br />
                  東京都渋谷区神宮前6-23-4 桑野ビル2F
                </dd>

                <dt style={styles.dt}>代表者</dt>
                <dd style={styles.dd}>代表取締役社長 濵村 涼輔</dd>

                <dt style={styles.dt}>連絡先</dt>
                <dd style={styles.dd}>070-4350-0294</dd>

                <dt style={styles.dt}>事業内容</dt>
                <dd style={styles.dd}>
                  マーケティングコンサルティング／人材系プラットフォーム事業／SaaS型事業の開発・運用 等
                </dd>

                <dt style={styles.dt}>設立</dt>
                <dd style={styles.dd}>2022年10月28日</dd>
              </dl>

              <div style={styles.btnRow}>
                <a
                  href="https://chainsoda.jp/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.btn, ...styles.primaryBtn }}
                >
                  株式会社CHAINSODA 公式サイト
                </a>
                <Link href="/" style={styles.btn}>
                  バク売れLPテンプレ（トップ）へ
                </Link>
              </div>

              <p style={styles.note}>
                サービス内容・利用規約・プライバシーポリシーに関するお問い合わせは、上記の公式サイトよりご連絡ください。
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>関連ページ</h2>
            <div style={styles.btnRow}>
              <Link href="/terms" style={styles.btn}>
                利用規約
              </Link>
              <Link href="/privacy" style={styles.btn}>
                プライバシーポリシー
              </Link>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
