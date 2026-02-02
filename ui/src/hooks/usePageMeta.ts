import { useEffect } from "react";
import { currentInstance, SEO_CONFIG } from "../utils/constants";

interface PageMetaOptions {
  title: string;
  description?: string;
  keywords?: string;
}

function getSeoDefaults() {
  const instanceId = currentInstance.id;
  return SEO_CONFIG[instanceId] ?? SEO_CONFIG.dev;
}

export function usePageMeta({ title, description, keywords }: PageMetaOptions) {
  useEffect(() => {
    const defaults = getSeoDefaults();
    const fullTitle =
      title === defaults.defaultTitle ? title : `${title} | ${defaults.siteName}`;
    document.title = fullTitle;

    const descContent = description ?? defaults.defaultDescription;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", descContent);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = descContent;
      document.head.appendChild(meta);
    }

    const keywordsContent = keywords ?? defaults.keywords;
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", keywordsContent);
    } else {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      metaKeywords.setAttribute("content", keywordsContent);
      document.head.appendChild(metaKeywords);
    }

    setMetaTag("og:title", fullTitle);
    setMetaTag("og:description", descContent);
    setMetaTag("og:site_name", defaults.siteName);

    return () => {
      const d = getSeoDefaults();
      document.title = d.defaultTitle;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", d.defaultDescription);
      const metaKw = document.querySelector('meta[name="keywords"]');
      if (metaKw) metaKw.setAttribute("content", d.keywords);
    };
  }, [title, description, keywords]);
}

function setMetaTag(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (meta) {
    meta.setAttribute("content", content);
  } else {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
  }
}

export default usePageMeta;
