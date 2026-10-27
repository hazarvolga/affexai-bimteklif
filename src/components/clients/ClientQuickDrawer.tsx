/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  User,
  FilePlus2,
  ExternalLink,
  MessageSquarePlus,
  Save,
  Clock,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";
import type { Client } from "@/types";
import {
  CLIENT_STAGE_LIST,
  CLIENT_STAGE_MAP,
  normalizeClientStageKey,
  parseClientNotes,
  type ClientStageKey,
} from "@/lib/client-notes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClientQuickDrawerProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: Client) => void;
}

export function ClientQuickDrawer({
  client,
  open,
  onOpenChange,
  onUpdated,
}: ClientQuickDrawerProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canMutate = !role || ["owner", "admin", "manager"].includes(role);
  const [name, setName] = useState("");
  const [type, setType] = useState<"company" | "person">("company");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [stage, setStage] = useState<ClientStageKey>("lead");
  const [noteStage, setNoteStage] = useState<ClientStageKey>("lead");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    const normalized = normalizeClientStageKey(client.pipelineStage);
    setName(client.name || "");
    setType(client.type === "person" ? "person" : "company");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setAddress(client.address || "");
    setStage(normalized);
    setNoteStage(normalized);
    setNoteText("");
  }, [client]);

  if (!client) return null;

  const timelineNotes = parseClientNotes(client.notes, client.pipelineStage, client.createdAt);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          pipelineStage: stage,
          ...(noteText.trim()
            ? {
                stageNote: {
                  stage: noteStage,
                  content: noteText.trim(),
                },
              }
            : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Müşteri bilgileri güncellenemedi.");
      }
      toast.success("Müşteri kartı ve aşama bilgileri güncellendi.");
      setNoteText("");
      onUpdated(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground sm:max-w-2xl max-h-[92dvh] overflow-y-auto p-0">
        <DialogHeader className="p-6 border-b border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              {type === "company" ? (
                <Building2 size={18} className="text-orange-500" />
              ) : (
                <User size={18} className="text-orange-500" />
              )}
              {client.name}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/app/clients/${client.id}`);
                }}
                className="text-xs gap-1.5"
              >
                <ExternalLink size={13} /> Tam Sayfa Detay & Notlar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/app/quotes/new?clientId=${client.id}`);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <FilePlus2 size={13} /> Teklif Hazırla
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
          {/* 6 Aşamalı Hızlı Durum Seçici */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block">
              Aktif Satış / Pipeline Aşaması
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CLIENT_STAGE_LIST.map((item) => {
                const active = stage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStage(item.id);
                      setNoteStage(item.id);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-all flex items-center gap-2 text-xs font-bold",
                      active
                        ? "border-orange-500 bg-orange-500/15 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", item.dotClass)} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* İletişim ve Ünvan Bilgileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="quick-client-name">
                Müşteri Adı / Firma Ünvanı
              </label>
              <Input
                id="quick-client-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="quick-client-type">
                Müşteri Tipi
              </label>
              <select
                id="quick-client-type"
                value={type}
                onChange={(e) => setType(e.target.value as "company" | "person")}
                className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                <option value="company">Kurumsal (Şirket / İdare)</option>
                <option value="person">Bireysel</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="quick-client-phone">
                Telefon / GSM
              </label>
              <Input
                id="quick-client-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="quick-client-email">
                E-posta Adresi
              </label>
              <Input
                id="quick-client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@firma.com"
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="quick-client-address">
                Adres / Şehir
              </label>
              <Input
                id="quick-client-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="İlçe / Şehir"
                className="bg-card border-border"
              />
            </div>
          </div>

          {/* Yeni Aşama Notu Ekleme */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="quick-stage-note"
                className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5"
              >
                <MessageSquarePlus size={14} className="text-orange-500" />
                Aşamaya Özel Not Ekle (İsteğe Bağlı)
              </label>
              <select
                value={noteStage}
                onChange={(e) => setNoteStage(e.target.value as ClientStageKey)}
                className="rounded border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
              >
                {CLIENT_STAGE_LIST.map((s) => (
                  <option key={s.id} value={s.id}>
                    Not Aşaması: {s.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              id="quick-stage-note"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={`${CLIENT_STAGE_MAP[noteStage].label} aşaması için görüşme, teklif, pazarlık veya karar notunuzu yazın...`}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <Link
              to="/app/crm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <Target size={14} className="text-emerald-400" /> Müşteriler & Fırsatlar Pipeline Görünümü
            </Link>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={saving || !canMutate}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-1.5"
              >
                <Save size={14} /> Değişiklikleri Kaydet
              </Button>
            </div>
          </div>

          {/* Geçmiş Aşama Notları Özeti */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Clock size={13} /> Aşama Notları Geçmişi ({timelineNotes.length})
              </h3>
              <Link
                to={`/app/clients/${client.id}`}
                onClick={() => onOpenChange(false)}
                className="text-xs text-orange-400 hover:underline font-semibold"
              >
                Tüm Zaman Tünelini Aç →
              </Link>
            </div>

            {timelineNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">
                Henüz bu müşteri için kaydedilmiş aşama notu bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {timelineNotes.slice(0, 6).map((n) => {
                  const meta = CLIENT_STAGE_MAP[n.stage];
                  return (
                    <div
                      key={n.id}
                      className="rounded-lg border border-border bg-card p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={cn("text-[10px]", meta.badgeClass)}>
                          {meta.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{n.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
