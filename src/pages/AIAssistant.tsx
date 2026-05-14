import React, { useState } from "react";
import { Sparkles, MessageSquare, History, Zap, Send, Users, Bot, Command, Trash2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export function AIAssistant() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: 'Merhaba! TeklifPro AI asistanıyım. Size teklif hazırlama, pazar analizi veya mevzuat hakkında nasıl yardımcı olabilirim?'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMsg = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      // Dummy response for now, but wired to future API
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Anladım. Bu konuda size en iyi teklif stratejisini hazırlıyorum. Ayrıca ilgili sektördeki %12 pazar büyümesini de hesaba katacağım.'
        }]);
        setLoading(false);
      }, 1000);
    } catch (e) {
      toast.error("AI yanıt veremedi.");
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="AI Strateji Asistanı" 
        description="Teklif hazırlama, pazar analizi ve kârlılık optimizasyonu için akıllı AI asistanı."
        icon={Sparkles}
        actions={
          <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest px-4 h-10 gap-2">
            <History size={16} /> Konuşma Geçmişi
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Suggestions/History */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none overflow-hidden">
            <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 py-4">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2">
                <Command size={14} className="text-orange-500" /> Hızlı Komutlar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {[
                { label: 'Sektör Analizi Çıkar', icon: Zap },
                { label: 'Risk Puanlaması Yap', icon: Zap },
                { label: 'Rakip Karşılaştırması', icon: Zap },
                { label: 'Kârlılık Projeksiyonu', icon: Zap }
              ].map((cmd, i) => (
                <Button 
                  key={i}
                  variant="ghost" 
                  className="w-full justify-start text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/50 gap-3 px-4 py-6 group"
                >
                  <cmd.icon size={14} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
                  {cmd.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none overflow-hidden border-dashed">
            <CardHeader className="py-4">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center justify-between">
                Sistem Durumu
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] text-emerald-500/70 font-black">ONLINE</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Model</p>
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-orange-500" />
                  <span className="text-xs font-black text-white tracking-tight">Gemini 1.5 Pro</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="lg:col-span-3 bg-zinc-900/30 border-zinc-800 flex flex-col h-[650px] shadow-none overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-orange-500/0"></div>
          
          <ScrollArea className="flex-1 p-8">
            <div className="space-y-8 max-w-4xl mx-auto">
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all shadow-lg",
                    m.role === 'assistant' 
                      ? "bg-zinc-900 border-zinc-800 text-orange-500 shadow-orange-900/10" 
                      : "bg-orange-600 border-orange-500 text-white shadow-orange-600/20"
                  )}>
                    {m.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                  </div>
                  <div className={cn(
                    "p-5 rounded-2xl text-sm leading-relaxed shadow-xl",
                    m.role === 'assistant' 
                      ? "bg-zinc-900/50 border border-zinc-800 text-zinc-200" 
                      : "bg-orange-600 text-white font-medium"
                  )}>
                    {m.content}
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-zinc-800/50">
                        <Button variant="ghost" size="sm" className="h-6 px-0 text-[10px] font-black text-zinc-600 hover:text-zinc-400 gap-1.5 uppercase tracking-widest">
                           Cevabı Kopyala
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-0 text-[10px] font-black text-zinc-600 hover:text-zinc-400 gap-1.5 uppercase tracking-widest">
                           Teklife Aktar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-orange-500/50 flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                  <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-orange-500/50 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-orange-500/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-orange-500/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <footer className="p-6 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-4 max-w-4xl mx-auto items-center"
            >
              <div className="relative flex-1">
                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <Input 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="İnşaat maliyetleri veya mevzuat analizi hakkında sor..." 
                  className="bg-zinc-950/50 border-zinc-800 focus:border-orange-500/50 h-14 pl-12 pr-4 transition-all text-sm font-medium rounded-xl"
                />
              </div>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 h-14 px-8 rounded-xl shadow-lg shadow-orange-900/20 group transition-all shrink-0">
                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </form>
            <div className="flex justify-center gap-6 mt-4">
               <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Enter Gönderir</span>
               <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Shift+Enter Yeni Satır</span>
            </div>
          </footer>
        </Card>
      </div>
    </PageContainer>
  );
}
