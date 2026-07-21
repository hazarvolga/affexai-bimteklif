import { useEffect } from 'react';

export function PublicMetadata({ title, description, canonicalPath, noIndex = false }: { title: string; description: string; canonicalPath: string; noIndex?: boolean }) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!element) { element = document.createElement('meta'); element.name = name; document.head.appendChild(element); }
      element.content = content;
    };
    setMeta('description', description);
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noIndex) {
      if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
      robots.content = 'noindex,nofollow';
    } else if (robots) {
      robots.remove();
    }
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}${canonicalPath}`;
  }, [canonicalPath, description, noIndex, title]);
  return null;
}
