import { useMemo, useState } from 'react';
import type { Project } from '../data/work';

type Props = {
  projects: Project[];
  tags: string[];
};

const ALL = 'Tutto';

export default function WorkGrid({ projects, tags }: Props) {
  const [active, setActive] = useState(ALL);

  const shown = useMemo(
    () => (active === ALL ? projects : projects.filter((p) => p.tags.includes(active))),
    [projects, active],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtra i lavori">
        {[ALL, ...tags].map((tag) => {
          const on = tag === active;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setActive(tag)}
              aria-pressed={on}
              className={[
                'rounded-full border px-4 py-1.5 font-mono text-xs tracking-wide transition',
                on
                  ? 'border-fg bg-fg text-canvas'
                  : 'border-line text-muted hover:border-muted',
              ].join(' ')}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <p className="mt-5 font-mono text-xs text-muted" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'lavoro' : 'lavori'}
        {active !== ALL && ` con ${active}`}
      </p>

      <ul className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
        {shown.map((project) => {
          const Card = project.href ? 'a' : 'div';
          return (
            <li key={project.name} className="bg-canvas">
              <Card
                {...(project.href
                  ? { href: project.href, target: '_blank', rel: 'noreferrer' }
                  : {})}
                className="group flex h-full flex-col gap-4 p-7 transition hover:bg-line/30 md:p-9"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                    {project.name}
                  </h3>
                  <span className="shrink-0 font-mono text-xs text-muted">{project.year}</span>
                </div>

                <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
                  {project.role}
                </p>

                <p className="leading-relaxed text-muted">{project.summary}</p>

                <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>

                {project.href && (
                  <span className="font-mono text-xs text-muted underline-offset-4 group-hover:underline">
                    Vedi il codice ↗
                  </span>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
