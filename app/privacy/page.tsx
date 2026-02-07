import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜バク売れLPテンプレ",
  description: "バク売れLPテンプレのプライバシーポリシーです。",
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
  h2: { fontSize: 18, margin: "0 0 8px" } as const,
  p: { margin: "0 0 10px", lineHeight: 1.9, color: "#111827" } as const,
  ul: { margin: "0 0 10px", paddingLeft: 18, lineHeight: 1.9, color: "#111827" } as const,
  note: { marginTop: 10, color: "#4b5563", lineHeight: 1.9 } as const,
};

export default function PrivacyPage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <nav aria-label="パンくず" style={styles.breadcrumb}>
          <Link href="/" style={styles.crumbLink}>
            トップ
          </Link>
          <span aria-hidden>›</span>
          <span>プライバシーポリシー</span>
        </nav>

        <article style={styles.card}>
          <h1 style={styles.h1}>プライバシーポリシー</h1>
          <p style={styles.lead}>
            バク売れLPテンプレ（以下「当サイト」）は、ユーザーの個人情報を適切に保護し、取り扱うために本プライバシーポリシーを定めます。
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>1. 取得する情報</h2>
            <p style={styles.p}>当サイトでは、以下の情報を取得する場合があります。</p>
            <ul style={styles.ul}>
              <li>お問い合わせやフォーム送信時に入力された情報（氏名、メールアドレス、会社名等）</li>
              <li>決済や購入手続きに関連して提供される情報（決済事業者を介して提供される範囲）</li>
              <li>アクセスログ情報（IPアドレス、ブラウザ、参照元、閲覧ページ、滞在時間等）</li>
              <li>Cookie等を用いて収集される識別子や行動履歴</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>2. 利用目的</h2>
            <p style={styles.p}>取得した情報は、以下の目的で利用します。</p>
            <ul style={styles.ul}>
              <li>商品・サービスの提供、本人確認、サポート対応</li>
              <li>お問い合わせへの回答、重要なお知らせ等の連絡</li>
              <li>不正行為・利用規約違反の防止、セキュリティ確保</li>
              <li>当サイトの改善、利用状況の分析、品質向上</li>
              <li>新機能、キャンペーン等の案内（必要に応じて）</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>3. Cookie等の利用</h2>
            <p style={styles.p}>
              当サイトでは、利便性向上やアクセス解析のため、Cookieや類似技術を使用する場合があります。
              Cookieはブラウザ設定により無効化できますが、一部機能が正しく動作しない場合があります。
            </p>
            <p style={styles.note}>
              また、当サイトでは今後、Google Analytics（GA4）、Metaピクセル、Microsoft Clarity等の解析・計測ツールを導入する場合があります。
              これらのツールはCookie等を利用してトラフィックデータを収集することがあります。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>4. 第三者提供</h2>
            <p style={styles.p}>
              当サイトは、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。
              ただし、業務委託先（決済、メール配信、ホスティング等）に必要な範囲で取り扱いを委託することがあります。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>5. 安全管理</h2>
            <p style={styles.p}>
              個人情報への不正アクセス、漏えい、改ざん、滅失等を防止するため、適切な安全管理措置を講じます。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>6. 開示・訂正・削除等</h2>
            <p style={styles.p}>
              ユーザーご本人から個人情報の開示、訂正、削除等の要請があった場合、法令に従い適切に対応します。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>7. 本ポリシーの変更</h2>
            <p style={styles.p}>
              本ポリシーは、法令改正や運用改善に伴い、予告なく改定される場合があります。最新の内容は当ページにて公表します。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>8. お問い合わせ</h2>
            <p style={styles.p}>本ポリシーに関するお問い合わせは、運営会社ページをご参照ください。</p>
            <p style={styles.note}>
              <Link href="/company" style={styles.crumbLink}>
                運営会社ページへ
              </Link>
            </p>
          </section>

          <p style={{ ...styles.note, marginTop: 18 }}>
            最終改定日：2026年1月21日
          </p>
        </article>
      </div>
    </main>
  );
}
