import { Importance, SourceChips } from "@/components/brain-ui";
import { Panel } from "@/components/ui";
import type { Brain, ProgressSummary } from "@/lib/brain";

/** Белешките на мозокот по тема, од најважната кон најмалку важната. */
export function BrainTopics({ brain, summary }: { brain: Brain; summary: ProgressSummary }) {
  const topics = [...brain.topics].sort((a, b) => b.importance - a.importance);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[var(--gap)] xl:grid-cols-2">
      {topics.map((t) => {
        const tp = summary.byTopic[t.id];
        return (
          <Panel
            key={t.id}
            id={`tema-${t.id}`}
            title={t.title}
            action={
              <span className="flex items-center gap-3">
                <Importance value={t.importance} />
                {tp && (
                  <span className="chip normal-case !tracking-normal">
                    {tp.done}/{tp.total} научени
                  </span>
                )}
              </span>
            }
          >
            <p className="text-sm text-ink-2">{t.summary}</p>
            <ul className="mt-3 space-y-2">
              {t.key_points.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-[14.5px] leading-relaxed">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <SourceChips ids={t.sources} brain={brain} />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
