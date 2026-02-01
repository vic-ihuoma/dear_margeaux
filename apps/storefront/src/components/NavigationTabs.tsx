import { useEffect, useRef, useState } from 'react';

/**
 * NavigationTabs - Buttery smooth animated tab navigation
 *
 * Key fix: Don't animate on click - let the page transition handle it.
 * Only animate when switching tabs within the same page context.
 */

interface Tab {
  label: string;
  href: string;
  matchPaths: string[];
}

const TABS: Tab[] = [
  { label: 'Shop', href: '/shop', matchPaths: ['/shop'] },
  { label: 'Drops', href: '/drops', matchPaths: ['/drops'] },
  { label: 'Lookbook', href: '/lookbook', matchPaths: ['/lookbook'] },
  { label: 'Journal', href: '/blog', matchPaths: ['/blog', '/journal'] },
];

const TAB_WIDTH = 88;
const TAB_HEIGHT = 32;

function getActiveTabIndex(pathname: string): number {
  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    if (tab.matchPaths.some((path) => pathname.startsWith(path))) {
      return i;
    }
  }
  return -1;
}

export default function NavigationTabs() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const initializedRef = useRef(false);
  const activeIndexRef = useRef(-1);

  // Keep ref in sync with state
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    // Get active index from URL - no animation on initial load
    const index = getActiveTabIndex(window.location.pathname);
    setActiveIndex(index);
    activeIndexRef.current = index;

    // Enable animations after first render
    requestAnimationFrame(() => {
      initializedRef.current = true;
    });

    // Reduced motion preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const motionHandler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', motionHandler);

    // Handle Astro page transitions - animate these
    const handlePageLoad = () => {
      const newIndex = getActiveTabIndex(window.location.pathname);
      if (initializedRef.current && newIndex !== activeIndexRef.current) {
        setShouldAnimate(true);
      }
      setActiveIndex(newIndex);
    };

    document.addEventListener('astro:page-load', handlePageLoad);
    window.addEventListener('popstate', handlePageLoad);

    return () => {
      mq.removeEventListener('change', motionHandler);
      document.removeEventListener('astro:page-load', handlePageLoad);
      window.removeEventListener('popstate', handlePageLoad);
    };
  }, []);

  // Don't animate on click - the page will navigate and we'll animate on astro:page-load
  const handleTabClick = (e: React.MouseEvent, index: number) => {
    if (index === activeIndex) {
      e.preventDefault(); // Already on this page
      return;
    }
    // Let the link navigate naturally - don't update state here
    // The astro:page-load event will handle the state update with animation
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < TABS.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : TABS.length - 1;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = TABS.length - 1;
        break;
    }

    if (newIndex !== null) {
      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs[newIndex]?.focus();
    }
  };

  const showIndicator = activeIndex >= 0;
  const translateX = Math.max(0, activeIndex) * TAB_WIDTH;

  // Determine if we should animate
  const useAnimation = shouldAnimate && !prefersReducedMotion;

  return (
    <div
      role="tablist"
      aria-label="Main navigation"
      className="relative flex"
      style={{ height: TAB_HEIGHT }}
    >
      {/* Sliding pill indicator */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 bg-primary rounded-full"
        style={{
          width: TAB_WIDTH,
          height: TAB_HEIGHT,
          opacity: showIndicator ? 1 : 0,
          transform: `translate3d(${translateX}px, 0, 0)`,
          transition: useAnimation
            ? 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease'
            : 'opacity 150ms ease',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          viewTransitionName: 'header-nav-tab-indicator',
        }}
        onTransitionEnd={() => setShouldAnimate(false)}
      />

      {/* Tab links */}
      {TABS.map((tab, index) => {
        const isActive = index === activeIndex;

        return (
          <a
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            tabIndex={isActive || activeIndex === -1 ? 0 : -1}
            onClick={(e) => handleTabClick(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={{
              width: TAB_WIDTH,
              height: TAB_HEIGHT,
              transition: 'color 200ms ease',
            }}
            className={`
              relative z-10 flex items-center justify-center
              text-sm font-medium rounded-full select-none
              focus-visible:outline-none focus-visible:ring-2 
              focus-visible:ring-primary/50 focus-visible:ring-offset-2 
              focus-visible:ring-offset-background
              ${isActive ? 'text-text-inverse' : 'text-text-muted hover:text-text'}
            `}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}
