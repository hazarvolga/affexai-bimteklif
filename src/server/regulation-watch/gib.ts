import { matchRegulationKeywords } from "./gazette";
import { z } from "zod";

export const GIB_ANNOUNCEMENTS_URL = "https://gib.gov.tr/api/gibportal/duyuru/listPublish?preview=false&page=0&size=30&sortFieldName=startdate&sortType=DESC";
const GIB_ANNOUNCEMENT_BASE = "https://gib.gov.tr/duyuru-arsivi/guncel/";
const NATIONWIDE = "UNIVERSAL";

const responseSchema = z.object({
  resultContainer: z.object({
    content: z.array(z.object({
      title: z.string(),
      slug: z.string().regex(/^[^/\\?#]+$/),
      startdate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
      ilkodu: z.string().nullable(),
      summary: z.string().nullable(),
    }).passthrough()).min(1),
  }).passthrough(),
}).passthrough();

/** Provincial tax office notices are left out; only nationwide announcements can change a rule. */
export function parseGibAnnouncements(json: string) {
  const { resultContainer } = responseSchema.parse(JSON.parse(json));
  return resultContainer.content.flatMap(entry => {
    if (entry.ilkodu !== NATIONWIDE) return [];
    const matchedKeywords = matchRegulationKeywords(`${entry.title} ${entry.summary ?? ""}`);
    if (!matchedKeywords.length) return [];
    return [{
      source: "gib" as const,
      matchScope: "title" as const,
      issueDate: entry.startdate.slice(0, 10),
      title: entry.title.trim(),
      url: `${GIB_ANNOUNCEMENT_BASE}${encodeURI(entry.slug)}`,
      matchedKeywords,
    }];
  });
}
