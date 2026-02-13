import React from 'react';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { getPublicLpBySlug, LpData, TrackingConfig } from '../cms/actions';
import PasswordProtect from './_components/PasswordProtect';
import { CountdownHeader, MenuHeader, FadeInImage, FixedFooterCta, SideImages, YoutubeEmbed } from './_components/LpClient';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getData(slug: string, preview = false) {
  try {
    return await getPublicLpBySlug(slug, preview);
  } catch (e: any) {
    console.error('[getData] Failed to fetch data:', e.message);
    return { lp: undefined, globalSettings: undefined };
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const preview = sp.preview === 'true';
  const { lp, globalSettings } = await getData(slug, preview);
  
  if (!lp || !globalSettings) return { title: 'Not Found' };

  const title = lp.pageTitle || lp.title || '';
  const description = lp.customMetaDescription || globalSettings.defaultMetaDescription || '';
  
  const rawFavicon = lp.customFavicon || globalSettings.defaultFavicon;
  let faviconUrl: string | undefined;
  if (rawFavicon) {
    const separator = rawFavicon.includes('?') ? '&' : '?';
    faviconUrl = `${rawFavicon}${separator}v=${Date.now()}`;
  }

  const ogpImage = lp.customOgpImage || globalSettings.defaultOgpImage;

  // LPページのメタ情報: 設定されているフィールドのみ出力
  const meta: Metadata = {};

  if (title) meta.title = title;
  if (description) meta.description = description;
  if (faviconUrl) {
    meta.icons = { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl };
  }

  // OG: title か description か ogpImage がある場合のみ出力
  if (title || description || ogpImage) {
    meta.openGraph = {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(ogpImage ? { images: [ogpImage] } : {}),
    };
  }

  // Twitter Card: ogpImage がある場合のみ出力
  if (ogpImage) {
    meta.twitter = {
      card: 'summary_large_image',
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      images: [ogpImage],
    };
  }

  return meta;
}

export default async function DynamicLpPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const preview = sp.preview === 'true';
  const { lp, globalSettings } = await getData(slug, preview);

  if (!lp || !globalSettings) return notFound();

  // 下書きステータスのLPは非公開（プレビュー時は許可）
  if (!preview && lp.status === 'draft') return notFound();

  const content = <LpContent lp={lp} globalSettings={globalSettings} />;

  if (lp.status === 'private' && lp.password) {
     return <PasswordProtect validPassword={lp.password}>{content}</PasswordProtect>;
  }

  return content;
}

function LpContent({ lp, globalSettings }: { lp: LpData, globalSettings: any }) {
  // トラッキング: LP個別値があれば優先、空ならグローバル設定を使用
  const tracking: TrackingConfig = {
    gtm: lp.tracking.gtm || globalSettings.defaultGtm || '',
    pixel: lp.tracking.pixel || globalSettings.defaultPixel || '',
    meta: lp.tracking.meta || '',
    useDefault: false,
  };

  const headCode = lp.customHeadCode || globalSettings.defaultHeadCode || '';

  // PC用背景画像: LP個別設定を優先、なければグローバル設定
  const pcBgImage = lp.pcBackgroundImage || globalSettings.pcBackgroundImage || '';

  // PC表示幅: 画面幅 × %、ただし最低425px
  const pcWidthPercent = globalSettings.pcWidthPercent || 30;

  return (
    <>
      {/* CSS変数でLP幅を定義: max(425px, Xvw) */}
      <style dangerouslySetInnerHTML={{ __html: `:root { --lp-width: max(425px, ${pcWidthPercent}vw); }` }} />

      {lp.customCss && (
        <style dangerouslySetInnerHTML={{ __html: lp.customCss }} />
      )}

      {headCode && (
         <div dangerouslySetInnerHTML={{ __html: headCode }} style={{display:'none'}} />
      )}

      {/* PC背景画像: 画面全体にフィットする固定背景 */}
      {pcBgImage && (
        <div
          className="hidden md:block fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${pcBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {tracking.gtm && (
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${tracking.gtm}');`}
        </Script>
      )}
      {tracking.gtm && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${tracking.gtm}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      )}

      {tracking.pixel && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${tracking.pixel}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      <main className="min-h-screen bg-white md:bg-transparent relative z-[1]">
        {/* PCサイド画像 (1280px以上のみ表示) */}
        {lp.sideImages && <SideImages config={lp.sideImages} pcWidthPercent={pcWidthPercent} />}

        {lp.header?.type === 'timer' && (
          <>
            <div className="fixed top-0 left-0 w-full z-[999] flex justify-center pointer-events-none">
              <div style={{width:'100%', maxWidth:'var(--lp-width)'}} className="pointer-events-auto shadow-lg">
                <CountdownHeader periodDays={lp.header.timerPeriodDays} />
              </div>
            </div>
            <div style={{maxWidth:'var(--lp-width)'}} className="w-full mx-auto h-[53px]" />
          </>
        )}

        {lp.header?.type === 'menu' && (
          <>
            <div className="fixed top-0 left-0 w-full z-[999] flex justify-center pointer-events-none">
              <div style={{width:'100%', maxWidth:'var(--lp-width)'}} className="pointer-events-auto shadow-sm relative">
                <MenuHeader logoSrc={lp.header.logoSrc} items={lp.header.menuItems} />
              </div>
            </div>
            <div style={{maxWidth:'var(--lp-width)'}} className="w-full mx-auto h-[60px]" />
          </>
        )}

        {/* コンテンツ */}
        <div style={{maxWidth:'var(--lp-width)'}} className="w-full mx-auto bg-white relative">
          {lp.images.map((img, index) => {
            const prevOverlap = index > 0 ? (lp.images[index - 1].overlapBelow ?? 0) : 0;
            return (
              <section key={index} className="w-full relative" id={img.customId || undefined}
                style={prevOverlap > 0 ? { marginTop: `-${prevOverlap}%`, position: 'relative', zIndex: index + 1 } : undefined}>
                {img.type === 'html' ? (
                  <div dangerouslySetInnerHTML={{ __html: img.htmlContent || '' }} />
                ) : img.type === 'youtube' ? (
                  <YoutubeEmbed
                    url={img.youtubeUrl || ''}
                    paddingX={img.youtubePaddingX ?? 6}
                    paddingY={img.youtubePaddingY ?? 0}
                    bgColor={img.youtubeBgColor || '#fff'}
                  />
                ) : (
                  <FadeInImage data={img} index={index} />
                )}
              </section>
            );
          })}
        </div>

        {lp.footerCta?.enabled && (
           <FixedFooterCta config={lp.footerCta} />
        )}
      </main>
    </>
  );
}