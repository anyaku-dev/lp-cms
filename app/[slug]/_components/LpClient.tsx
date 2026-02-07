'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Jost, Zen_Kaku_Gothic_New } from 'next/font/google';
import { MenuItem, FooterCtaConfig, SideImagesConfig } from '../../cms/actions';

const jost = Jost({ subsets: ['latin'], weight: ['500'], display: 'swap' });
const zenKaku = Zen_Kaku_Gothic_New({ subsets: ['latin'], weight: ['700'], display: 'swap' });

const ANIMATION_CLASS_VISIBLE = 'opacity-100 translate-y-0';
const ANIMATION_CLASS_HIDDEN = 'opacity-0 translate-y-10';
const ANIMATION_TRANSITION = 'transition-all duration-1000 ease-out';

// --- カウントダウンタイマー ---
export function CountdownHeader({ periodDays }: { periodDays: number }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const PERIOD_SEC = periodDays * 24 * 60 * 60;

    const tick = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      let remain = PERIOD_SEC - (nowSec % PERIOD_SEC);
      if (remain === 0) remain = PERIOD_SEC;

      const days = Math.floor(remain / (24 * 60 * 60));
      const hours = Math.floor((remain % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((remain % (60 * 60)) / 60);
      const seconds = remain % 60;
      setTimeLeft({ days, hours, minutes, seconds });
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [periodDays]);

  if (!mounted) return <div style={{ height: 53, background: '#1B2024' }} />;

  return (
    <div className={`w-full bg-[#1b2024] overflow-hidden ${zenKaku.className}`}>
      <div className="w-full h-[53px] flex items-stretch bg-[#1b2024] overflow-hidden">
        <div className="flex-none h-[53px] w-[clamp(140px,36vw,150px)] overflow-hidden leading-[0]">
            <img src="/lp-001/timer-left.svg" alt="Remain" className="w-full h-full block object-cover object-center" draggable={false} />
        </div>
        <div className="flex-1 min-w-0 h-[53px] flex items-center justify-start gap-[clamp(10px,3vw,18px)] px-[clamp(10px,3vw,16px)] overflow-hidden text-white">
           <TimerItem num={timeLeft.days} unit="日" />
           <TimerItem num={timeLeft.hours} unit="時間" />
           <TimerItem num={timeLeft.minutes} unit="分" />
           <TimerItem num={timeLeft.seconds} unit="秒" />
        </div>
      </div>
    </div>
  );
}

const TimerItem = ({ num, unit }: { num: number, unit: string }) => (
  <div className="inline-flex items-baseline gap-[clamp(4px,1.2vw,8px)] whitespace-nowrap min-w-0">
     <span className={`text-[#fff12f] font-medium tabular-nums leading-none tracking-[0.8px] text-[clamp(23px,6.5vw,28px)] ${jost.className}`}>
       {String(num).padStart(2, '0')}
     </span>
     <i className="text-[#fff12f] not-italic font-bold leading-none whitespace-nowrap text-[clamp(9px,2.7vw,11px)]">{unit}</i>
  </div>
);

// --- メニューヘッダー ---
export function MenuHeader({ logoSrc, items }: { logoSrc?: string, items: MenuItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="relative w-full h-[60px] bg-white shadow-sm flex items-center justify-between px-4 z-[50]">
        <div className="h-[40px]">
          {logoSrc && <img src={logoSrc} alt="Logo" className="h-full w-auto object-contain" />}
        </div>
        <button onClick={() => setIsOpen(true)} className="p-3 -mr-2">
          <div className="w-6 h-0.5 bg-gray-900 mb-1.5 rounded-full"></div>
          <div className="w-6 h-0.5 bg-gray-900 mb-1.5 rounded-full"></div>
          <div className="w-6 h-0.5 bg-gray-900 rounded-full"></div>
        </button>
      </header>

      <div 
        className={`fixed inset-y-0 left-1/2 transform -translate-x-1/2 w-full max-w-[425px] z-[100] transition-visibility duration-300 ${isOpen ? 'visible' : 'invisible'}`}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        <div 
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsOpen(false)}
        />

        <div 
          className={`absolute top-0 right-0 h-full w-[280px] bg-white shadow-xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-end p-4 border-b border-gray-100">
            <button 
              onClick={() => setIsOpen(false)} 
              className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="メニューを閉じる"
            >
              <span className="text-3xl leading-none font-light">&times;</span>
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {items.map((item, idx) => (
                <li key={idx}>
                  <Link 
                    href={item.href} 
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-4 text-base font-bold text-gray-800 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

// --- 固定フッターCTA ---
export function FixedFooterCta({ config }: { config: FooterCtaConfig }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      const isAfterStart = scrollY >= (config.showAfterPx || 0);
      const remaining = docHeight - (scrollY + windowHeight);
      const isBeforeEnd = config.hideBeforeBottomPx > 0 ? remaining > config.hideBeforeBottomPx : true;

      setIsVisible(isAfterStart && isBeforeEnd);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [config.showAfterPx, config.hideBeforeBottomPx]);

  if (!config.enabled || !config.imageSrc) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 w-full z-[80] pointer-events-none flex justify-center transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="w-full max-w-[425px] pointer-events-none relative">
        <div 
           className="absolute bottom-0 left-0 w-full flex justify-center pointer-events-none" 
           style={{ paddingBottom: `${config.bottomMargin}px` }}
        >
          <a 
            href={config.href} 
            className={`block transition-transform active:scale-[0.98] hover:opacity-95 ${
              isVisible ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{ width: `${config.widthPercent}%` }}
          >
            <img 
              src={config.imageSrc} 
              alt="CTA" 
              className="w-full h-auto block drop-shadow-xl" 
            />
          </a>
        </div>
      </div>
    </div>
  );
}

// --- 画像表示 ---
export const FadeInImage = ({ data, index }: { data: any; index: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      id={data.customId}
      // ★修正: leading-[0] font-[0] を削除し、正常なLPと同じ構造に戻しました
      className={`relative w-full ${ANIMATION_TRANSITION} ${isVisible ? ANIMATION_CLASS_VISIBLE : ANIMATION_CLASS_HIDDEN}`}
    >
      <Image
        src={data.src}
        alt={data.alt}
        width={0} height={0}
        sizes="(max-width: 768px) 100vw, 425px"
        className="w-full h-auto block"
        priority={index < 2}
      />
      {data.links?.map((link: any, i: number) => (
        <Link
          key={i}
          href={link.href}
          aria-label={link.ariaLabel}
          className="absolute block z-10"
          style={{
            left: `${link.left}%`,
            top: `${link.top}%`,
            width: `${link.width}%`,
            height: `${link.height}%`,
          }}
        />
      ))}
    </div>
  );
};

// --- PCサイド画像 ---
export function SideImages({ config }: { config: SideImagesConfig }) {
  const left = config?.left;
  const right = config?.right;

  const hasLeft = left?.src ? true : false;
  const hasRight = right?.src ? true : false;

  if (!hasLeft && !hasRight) return null;

  return (
    <>
      {hasLeft && (
        <div
          className="hidden md:block fixed z-[1] pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: `${left.widthPercent || 15}%`,
            height: '100%',
          }}
        >
          <img
            src={left.src}
            alt=""
            className="w-full h-auto"
            style={{
              position: left.verticalAlign === 'center' ? 'absolute' : 'static',
              ...(left.verticalAlign === 'center'
                ? { top: '50%', transform: 'translateY(-50%)' }
                : { marginTop: 0 }),
            }}
          />
        </div>
      )}
      {hasRight && (
        <div
          className="hidden md:block fixed z-[1] pointer-events-none"
          style={{
            right: 0,
            top: 0,
            width: `${right.widthPercent || 15}%`,
            height: '100%',
          }}
        >
          <img
            src={right.src}
            alt=""
            className="w-full h-auto"
            style={{
              position: right.verticalAlign === 'center' ? 'absolute' : 'static',
              ...(right.verticalAlign === 'center'
                ? { top: '50%', transform: 'translateY(-50%)' }
                : { marginTop: 0 }),
            }}
          />
        </div>
      )}
    </>
  );
}