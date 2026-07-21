import { useEffect } from 'react';

export function PublicMetadata({ title, description, canonicalPath }: { title: string; description: string; canonicalPath: string }) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!element) { element = document.createElement('meta'); element.name = name; document.head.appendChild(element); }
      element.content = content;
    };
    setMeta('description', description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}${canonicalPath}`;
  }, [canonicalPath, description, title]);
  return null;
}
