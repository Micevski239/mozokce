import { BookOpen, Brain, CalendarDays, FileUp, HardDrive, MessagesSquare, ShieldCheck, StickyNote, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui";

const SECTIONS: { title: string; icon: LucideIcon; tone: string; body: string[] }[] = [
  {
    title: "Предмети",
    icon: BookOpen,
    tone: "bg-accent-soft text-accent-2",
    body: [
      "Додај ги предметите што ги полагаш овој семестар. Старите семестри архивирај ги од поставките на предметот.",
      "Предметите, календарот и материјалите се заеднички: доаѓаат со репото од GitHub.",
    ],
  },
  {
    title: "Датотеки",
    icon: FileUp,
    tone: "bg-accent-soft text-accent-2",
    body: [
      "Качи предавања, стари колоквиуми, скриншоти и презентации (PDF, слики, PowerPoint, Word, текст, до 50 MB). Може повеќе одеднаш, или со повлекување во полето.",
    ],
  },
  {
    title: "Discord чат",
    icon: MessagesSquare,
    tone: "bg-[rgba(124,92,255,.14)] text-[#7C5CFF]",
    body: [
      "Копирај ги пораките од Discord и залепи ги. Не мора да се чистат: имињата, времињата и муабетот ги филтрира Claude кога прави мозок.",
      "Стави го датумот на разговорот, за да се знае дали информацијата е од оваа или од лани година.",
    ],
  },
  {
    title: "Белешки",
    icon: StickyNote,
    tone: "bg-warn-soft text-warn",
    body: ["Кратки работи што ги слушна на час или од колега: „ова сигурно ќе биде“, „ова не влегува“, „задачата носи 20 поени“."],
  },
  {
    title: "Извор и датум",
    icon: ShieldCheck,
    tone: "bg-success-soft text-success",
    body: [
      "Секој материјал има извор: Официјално (професор, курс), Колоквиум/испит, Студенти (Discord) или Друго. Официјалното вреди повеќе од гласина на Discord.",
    ],
  },
  {
    title: "Пребарување",
    icon: CalendarDays,
    tone: "bg-accent-soft text-accent-2",
    body: ["Во секој предмет може да пребаруваш низ насловите и низ целиот текст на чатовите и белешките."],
  },
  {
    title: "Мозок на предметот",
    icon: Brain,
    tone: "bg-accent-soft text-accent-2",
    body: [
      "Предметите со мозок имаат „Преглед“ (како се полага, на што да се фокусираш), „Теми“ и „Прашања“.",
      "Мозокот го прави Claude од материјалите што ќе му ги пратиш, и стигнува до колегите преку GitHub. Прашањата се исти за сите.",
    ],
  },
  {
    title: "Заедничко и лично",
    icon: HardDrive,
    tone: "bg-success-soft text-success",
    body: [
      "Нема најава ни база. Предметите, календарот и материјалите се во папката data/ и се споделуваат преку GitHub: што ќе додаде еден, другиот го гледа по git push и git pull.",
      "Напредокот со прашањата и името се лични, во папката .mozokce/. Таа не оди на GitHub, па секој има свој напредок. Ако ја избришеш, напредокот се губи.",
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="w-full space-y-[var(--gap)]">
      <PageHeader kicker="Како работи" title="Водич" subtitle="Собери сè за секој предмет на едно место." />
      <div className="auto-grid [--min:21rem] !gap-[var(--gap)]">
        {SECTIONS.map(({ title, icon: Icon, tone, body }) => (
          <section key={title} className="glass p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <h2 className="display text-[15px] font-semibold">{title}</h2>
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-ink-2">
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
