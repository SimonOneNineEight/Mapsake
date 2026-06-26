import { getRequestConfig } from "next-intl/server";

// next-intl request config (Story 6.1). SINGLE hard-fixed locale (zh-TW) — English is deferred
// post-v1, so there is no locale routing/negotiation. CRITICAL: this returns a HARDCODED locale and
// never reads `requestLocale`/`headers()`/`cookies()`, which is what keeps translation reads static
// and compatible with `cacheComponents: true` (reading the request locale is what would force the
// app dynamic). When `en` lands, this is where locale selection would go.
export default getRequestConfig(async () => {
  const locale = "zh-TW";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
