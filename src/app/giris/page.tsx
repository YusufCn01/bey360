import { LoginForm, type LoginAnnouncementItem } from "@/components/forms/login-form";
import { prisma } from "@/lib/db/prisma";

const PLATFORM_ANNOUNCEMENTS_SCOPE = "platform_announcements";
const PLATFORM_UPDATES_SCOPE = "platform_updates";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isVisibleNow(row: Record<string, unknown>, now: Date): boolean {
  if (!asBoolean(row.isActive, true)) {
    return false;
  }

  const publishAtRaw = asText(row.publishAt);
  if (publishAtRaw) {
    const publishAt = new Date(publishAtRaw);
    if (!Number.isNaN(publishAt.getTime()) && publishAt > now) {
      return false;
    }
  }

  const expiresAtRaw = asText(row.expiresAt);
  if (expiresAtRaw) {
    const expiresAt = new Date(expiresAtRaw);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
      return false;
    }
  }

  return true;
}

function parsePlatformAnnouncements(payload: unknown, now: Date): LoginAnnouncementItem[] {
  const items = asArray(asRecord(payload).items);

  return items
    .map((item) => asRecord(item))
    .filter((row) => {
      const targetScope = asText(row.targetScope);
      if (targetScope && targetScope !== "all") {
        return false;
      }
      return isVisibleNow(row, now);
    })
    .map((row) => {
      const title = asText(row.title);
      const message = asText(row.message);
      const toneRaw = asText(row.tone);
      const tone: LoginAnnouncementItem["tone"] =
        toneRaw === "success" || toneRaw === "warning" || toneRaw === "danger" ? toneRaw : "info";
      const publishAt = asText(row.publishAt);

      return {
        id: asText(row.id) || crypto.randomUUID(),
        title: title || "Duyuru",
        message,
        tone,
        isPinned: asBoolean(row.isPinned, false),
        publishAt: publishAt || null,
      };
    })
    .filter((row) => row.message.length > 0);
}

function parsePlatformUpdates(payload: unknown, now: Date): LoginAnnouncementItem[] {
  const items = asArray(asRecord(payload).items);

  return items
    .map((item) => asRecord(item))
    .filter((row) => {
      const targetScope = asText(row.targetScope);
      if (targetScope && targetScope !== "all") {
        return false;
      }
      return isVisibleNow(row, now);
    })
    .map((row) => {
      const version = asText(row.version);
      const title = asText(row.title) || "Sistem Güncellemesi";
      const summary = asText(row.summary);
      const isForce = asBoolean(row.isForce, false);
      const publishAt = asText(row.publishAt);

      return {
        id: asText(row.id) || crypto.randomUUID(),
        title: version ? `${title} (v${version})` : title,
        message: summary,
        tone: isForce ? "warning" : "info",
        isPinned: asBoolean(row.isPinned, false),
        publishAt: publishAt || null,
      } satisfies LoginAnnouncementItem;
    })
    .filter((row) => row.message.length > 0);
}

function getFallbackAnnouncements(): LoginAnnouncementItem[] {
  return [
    {
      id: "fallback-announcement-1",
      title: "Güncelleme Başarılı",
      message: "v2.4.1 e-Fatura entegrasyon modülü devreye alındı.",
      tone: "success",
      isPinned: true,
      publishAt: null,
    },
    {
      id: "fallback-announcement-2",
      title: "Bakım Çalışması",
      message: "Pazar günü 02:00 - 04:00 arası veritabanı optimizasyonu yapılacaktır.",
      tone: "info",
      isPinned: false,
      publishAt: null,
    },
  ];
}

async function getLoginAnnouncements(): Promise<{ announcements: LoginAnnouncementItem[]; appVersion: string }> {
  try {
    const now = new Date();
    const [announcementRow, updateRow] = await Promise.all([
      prisma.appSettings.findFirst({
        where: {
          deletedAt: null,
          code: PLATFORM_ANNOUNCEMENTS_SCOPE,
        },
        orderBy: { createdAt: "desc" },
        select: { payload: true },
      }),
      prisma.appSettings.findFirst({
        where: {
          deletedAt: null,
          code: PLATFORM_UPDATES_SCOPE,
        },
        orderBy: { createdAt: "desc" },
        select: { payload: true },
      }),
    ]);

    const announcementItems = parsePlatformAnnouncements(announcementRow?.payload, now);
    const updateItems = parsePlatformUpdates(updateRow?.payload, now);
    const merged = [...announcementItems, ...updateItems].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return (b.publishAt ?? "").localeCompare(a.publishAt ?? "");
    });

    const appVersion =
      asArray(asRecord(updateRow?.payload).items)
        .map((item) => asRecord(item))
        .map((item) => asText(item.version))
        .find((value) => value.length > 0) ?? "2.4.1089";

    if (merged.length === 0) {
      return {
        announcements: getFallbackAnnouncements(),
        appVersion,
      };
    }

    return {
      announcements: merged.slice(0, 4),
      appVersion,
    };
  } catch {
    return {
      announcements: getFallbackAnnouncements(),
      appVersion: "2.4.1089",
    };
  }
}

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { announcements, appVersion } = await getLoginAnnouncements();

  return (
    <div className="min-h-screen bg-[#eef1f5] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full items-center justify-center">
        <LoginForm announcements={announcements} appVersion={appVersion} />
      </div>
    </div>
  );
}
