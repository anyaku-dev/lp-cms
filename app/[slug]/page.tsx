import React from 'react';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { getLps, getGlobalSettings, LpData, TrackingConfig } from '../cms/actions';
import PasswordProtect from './_components/PasswordProtect';
import { CountdownHeader, MenuHeader, FadeInImage, FixedFooterCta, SideImages, YoutubeEmbed } from './_components/LpClient';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

async function getData(slug: string) {
  try {
    const [lps, globalSettings] = await Promise.all([getLps(), getGlobalSettings()]);
    const lp = lps.find(item => item.slug === slug);
    return { lp, globalSettings };
  } catch (e: any) {
    console.error('[getData] Failed to fetch data:', e.message);
    return { lp: undefined, globalSettings: undefined };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lp, globalSettings } = await getData(slug);
  
  if (!lp || !globalSettings) return { title: 'Not Found' };

  const title = lp.pageTitle || lp.title;
  const description = lp.customMetaDescription || globalSettings.defaultMetaDescription || '';
  
  const rawFavicon = lp.customFavicon || globalSettings.defaultFavicon;
  let faviconUrl = '/favicon.ico';
  if (rawFavicon) {
    const separator = rawFavicon.includes('?') ? '&' : '?';
    faviconUrl = `${rawFavicon}${separator}v=${Date.now()}`;
  }

  const ogpImage = lp.customOgpImage || globalSettings.defaultOgpImage;

  return {
    title: title,
    description: description,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
    openGraph: {
      title: title,
      description: description,
      images: ogpImage ? [ogpImage] : [],
    },
  };
}

export default async function DynamicLpPage({ params }: Props) {
  const { slug } = await params;
  const { lp, globalSettings } = await getData(slug);

  if (!lp || !globalSettings) return notFound();

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

  return (
    <>
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
        {/* PCサイド画像 */}
        {lp.sideImages && <SideImages config={lp.sideImages} pcMaxWidth={globalSettings.pcMaxWidth || 425} />}

        {lp.header?.type === 'timer' && (
          <>
            <div className="fixed top-0 left-0 w-full z-[999] flex justify-center pointer-events-none">
              <div className="w-full md:max-w-[425px] pointer-events-auto shadow-lg">
                <CountdownHeader periodDays={lp.header.timerPeriodDays} />
              </div>
            </div>
            <div className="w-full md:max-w-[425px] mx-auto h-[53px]" />
          </>
        )}

        {lp.header?.type === 'menu' && (
          <>
            <div className="fixed top-0 left-0 w-full z-[999] flex justify-center pointer-events-none">
              <div className="w-full md:max-w-[425px] pointer-events-auto shadow-sm relative">
                <MenuHeader logoSrc={lp.header.logoSrc} items={lp.header.menuItems} />
              </div>
            </div>
            <div className="w-full md:max-w-[425px] mx-auto h-[60px]" />
          </>
        )}

        {/* コンテンツ */}
        {/* ★修正: flex flex-col を削除し、正常なLPと同じブロックレイアウトに戻しました */}
        <div className="md:max-w-[425px] w-full mx-auto bg-white relative">
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