import { Brain, FolderOpen, MessagesSquare, Search } from "lucide-react";
import type { ReactNode } from "react";

const FEATURES = [
  { icon: FolderOpen, title: "Материјали", text: "Предавања, скрипти и стари колоквиуми, подредени по предмет." },
  { icon: MessagesSquare, title: "Discord", text: "Залепи ги корисните пораки и зачувај ги со датумот." },
  { icon: Search, title: "Пребарување", text: "Најди сè низ сите предмети, и во текстот на чатовите." },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <span className="chip-accent flex h-11 w-11 items-center justify-center rounded-2xl border">
            <Brain size={22} strokeWidth={1.75} />
          </span>
          <span className="display text-2xl font-semibold">Мозокче</span>
        </div>
        <div className="space-y-3">
          <div className="kicker flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Систем за учење
          </div>
          <h1 className="display max-w-xl text-[2rem] font-semibold leading-[1.1] sm:text-5xl">
            Учи попаметно. Совладај го <span className="text-accent-2">секој предмет</span>.
          </h1>
          <p className="max-w-lg text-lg text-ink-2">
            Материјали, Discord пораки и белешки за секој предмет, на едно место. Кога ќе дојде време за учење, сè е тука.
          </p>
        </div>
        <ul className="hidden gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="glass p-4">
              <Icon size={18} strokeWidth={1.9} className="text-accent-2" />
              <div className="mt-2 font-mono text-sm font-semibold">{title}</div>
              <div className="mt-1 text-sm text-ink-2">{text}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="glass w-full max-w-md justify-self-center p-6 sm:p-8 lg:justify-self-end">{children}</div>
    </main>
  );
}
