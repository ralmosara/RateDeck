import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import { Icon, type IconName } from './Icon';
import s from './primitives.module.css';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  style,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={cx(s.card, className)} style={style}>
      {(title || actions) && (
        <header className={s.cardHeader}>
          <div>
            {title && <h2 className={s.cardTitle}>{title}</h2>}
            {subtitle && <p className={s.cardSubtitle}>{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  variant = 'default',
  icon,
  children,
  className,
  loading,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost'; icon?: IconName; loading?: boolean }) {
  return (
    <button
      type="button"
      className={cx(s.button, variant === 'primary' && s.primary, variant === 'ghost' && s.ghost, className)}
      {...rest}
    >
      {loading ? <Icon name="spinner" size={16} className={s.spin} /> : icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

export function Badge({ tone = 'neutral', dot, live, children }: { tone?: Tone; dot?: boolean; live?: boolean; children: ReactNode }) {
  return (
    <span className={s.badge} data-tone={tone}>
      {dot && <span className={cx(s.dot, live && s.dotLive)} />}
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  foot,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  icon: IconName;
  delta?: number;
  foot?: ReactNode;
  delay?: number;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <section className={cx(s.card, s.kpi)} style={{ animationDelay: `${delay}ms` }}>
      <div className={s.kpiLabel}>
        <span className={s.kpiIcon}>
          <Icon name={icon} size={16} />
        </span>
        {label}
      </div>
      <div className={s.kpiValue}>{value}</div>
      <div className={s.kpiFoot}>
        {delta !== undefined && (
          <span className={cx(s.delta, up ? s.deltaUp : s.deltaDown)}>
            <Icon name={up ? 'arrowUp' : 'arrowDown'} size={12} />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {foot}
      </div>
    </section>
  );
}

export function Input({
  label,
  hint,
  error,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label className={s.fieldLabel} htmlFor={input.id ?? id}>
        {label}
      </label>
      <input id={input.id ?? id} className={s.input} aria-invalid={!!error} {...input} />
      {(error || hint) && (
        <span className={s.hint} style={error ? { color: 'var(--rd-color-danger)' } : undefined}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}
