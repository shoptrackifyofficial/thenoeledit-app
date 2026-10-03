import Script from "next/script";

/**
 * Marketing + analytics tags. Each loads only when its env id is set, and
 * only after the page is idle (`lazyOnload`), so none of them can touch FCP,
 * LCP or interaction latency. Commerce events are sent from lib/analytics.ts.
 *
 * Add a consent banner before enabling these for EU/UK traffic.
 */
export function Analytics() {
  const gtm = process.env.NEXT_PUBLIC_GTM_ID;
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const clarity = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const safe = (v: string | undefined) => (v && /^[A-Za-z0-9_-]{4,40}$/.test(v) ? v : null);

  return (
    <>
      {safe(gtm) && (
        <Script id="gtm" strategy="lazyOnload">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${safe(gtm)}');`}
        </Script>
      )}
      {safe(ga) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${safe(ga)}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${safe(ga)}');`}
          </Script>
        </>
      )}
      {safe(meta) && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${safe(meta)}');fbq('track','PageView');`}
        </Script>
      )}
      {safe(tiktok) && (
        <Script id="tiktok-pixel" strategy="lazyOnload">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${safe(tiktok)}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}
      {safe(clarity) && (
        <Script id="clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${safe(clarity)}");`}
        </Script>
      )}
    </>
  );
}
