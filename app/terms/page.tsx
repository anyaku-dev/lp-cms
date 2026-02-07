import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約｜バク売れLPテンプレ",
  description: "バク売れLPテンプレの利用規約です。",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "28px 16px 60px",
  } as const,
  container: {
    maxWidth: 920,
    margin: "0 auto",
  } as const,
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 14,
    flexWrap: "wrap" as const,
  } as const,
  crumbLink: {
    color: "#2563eb",
    textDecoration: "none",
  } as const,
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
    padding: "26px 22px",
  } as const,
  h1: {
    fontSize: 28,
    margin: "0 0 10px",
    letterSpacing: "-0.02em",
  } as const,
  lead: {
    color: "#374151",
    margin: "0 0 18px",
    lineHeight: 1.9,
  } as const,
  section: {
    marginTop: 22,
  } as const,
  h2: {
    fontSize: 18,
    margin: "0 0 8px",
  } as const,
  p: {
    margin: "0 0 10px",
    lineHeight: 1.9,
    color: "#111827",
  } as const,
  ul: {
    margin: "0 0 10px",
    paddingLeft: 18,
    lineHeight: 1.9,
    color: "#111827",
  } as const,
  note: {
    marginTop: 10,
    color: "#4b5563",
    lineHeight: 1.9,
  } as const,
  hr: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "18px 0",
  } as const,
};

export default function TermsPage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <nav aria-label="パンくず" style={styles.breadcrumb}>
          <Link href="/" style={styles.crumbLink}>
            トップ
          </Link>
          <span aria-hidden>›</span>
          <span>利用規約</span>
        </nav>

        <article style={styles.card}>
          <h1 style={styles.h1}>利用規約</h1>
          <p style={styles.lead}>
            本利用規約（以下「本規約」）は、バク売れLPテンプレ（以下「本サービス」）の利用条件を定めるものです。
            ユーザーは本規約に同意のうえ、本サービスを利用するものとします。
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>1. 定義</h2>
            <ul style={styles.ul}>
              <li>「テンプレート」：本サービスで提供するLPデザインテンプレート、構成、素材セット等</li>
              <li>「ユーザー」：本サービスを閲覧、購入、利用する個人または法人</li>
              <li>「運営者」：本サービスの運営主体</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>2. ライセンス（利用範囲）</h2>
            <p style={styles.p}>ユーザーは、購入したテンプレートを、以下の範囲で利用できます。</p>
            <ul style={styles.ul}>
              <li>商用利用：可（自社・クライアント案件いずれも可）</li>
              <li>改変：可（文字・画像差し替え、レイアウト調整、色変更、構成追加等）</li>
              <li>制作物の公開：可（完成したLPをWeb公開、広告配信等）</li>
            </ul>
            <p style={styles.note}>
              なお、テンプレートそのもの（データ一式）の再配布・転売・共有を許諾するものではありません。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>3. 禁止事項</h2>
            <p style={styles.p}>ユーザーは、以下の行為を行ってはなりません。</p>
            <ul style={styles.ul}>
              <li>
                テンプレートデータの再配布、販売、貸与、無償配布、共有（第三者がテンプレとして使える状態で渡す行為を含む）
              </li>
              <li>本サービスの著作権表示・権利表示の不正な削除（必要な範囲を除く）</li>
              <li>法令または公序良俗に反する目的での利用</li>
              <li>第三者の権利侵害（著作権、商標権、プライバシー等）に該当する利用</li>
              <li>運営者または第三者に不利益・損害を与える行為</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>4. 素材の取り扱い</h2>
            <p style={styles.p}>
              本サービスで使用している一部素材（画像・アイコン等）は、配布サイトの利用規約上、商用利用・再利用が可能な素材を採用しています。
              ただし、ユーザーの利用方法や利用先の媒体によっては、追加の確認が必要となる場合があります。
            </p>
            <p style={styles.note}>
              ユーザーが差し替える素材（写真、ロゴ、文章等）については、ユーザー自身の責任で権利処理を行ってください。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>5. 免責事項</h2>
            <ul style={styles.ul}>
              <li>本サービスは、特定の成果（売上増加等）を保証するものではありません。</li>
              <li>ユーザーの利用により生じた損害について、運営者は故意または重過失がある場合を除き責任を負いません。</li>
              <li>通信回線、端末、外部サービスの不具合等により生じた損害について、運営者は責任を負いません。</li>
            </ul>
          </section>

          <hr style={styles.hr} />

          <section style={styles.section}>
            <h2 style={styles.h2}>6. 返品・返金</h2>
            <p style={styles.p}>
              デジタルコンテンツの性質上、原則として購入後の返品・返金はお受けできません。
              ただし、提供データに重大な欠陥があり、合理的な範囲で修正が不可能な場合は、この限りではありません。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>7. 規約の変更</h2>
            <p style={styles.p}>
              運営者は、必要に応じて本規約を改定できます。改定後の規約は当ページに掲示した時点で効力を生じます。
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>8. 準拠法・管轄</h2>
            <p style={styles.p}>
              本規約は日本法に準拠し、紛争が生じた場合は運営者所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
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
