import { IndustryPlugin } from "./types";
import { INITIAL_PLUGINS } from "./definitions";

class IndustryRegistry {
  private plugins: Map<string, IndustryPlugin> = new Map();

  constructor() {
    INITIAL_PLUGINS.forEach(plugin => this.register(plugin));
  }

  register(plugin: IndustryPlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  getIndustry(id: string): IndustryPlugin | undefined {
    return this.plugins.get(id);
  }

  listIndustries(): IndustryPlugin[] {
    return Array.from(this.plugins.values());
  }

  detectIndustry(text: string): string {
    const t = text.toLowerCase();
    
    if (t.includes("villa") || t.includes("ev") || t.includes("daire") || t.includes("apartman") || t.includes("konut")) 
      return "residential";
    
    if (t.includes("elektrik") || t.includes("kablo") || t.includes("pano") || t.includes("aydınlatma")) 
      return "electrical";
      
    if (t.includes("mekanik") || t.includes("hvac") || t.includes("klima") || t.includes("boru") || t.includes("tesisat")) 
      return "mechanical";
      
    if (t.includes("tadilat") || t.includes("tamirat") || t.includes("boya") || t.includes("dekorasyon")) 
      return "renovation";
      
    return "residential";
  }
}

export const registry = new IndustryRegistry();
