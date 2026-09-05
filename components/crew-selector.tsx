'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RURAL_CREWS, URBAN_CREWS } from '@/lib/records';

type Props = { value: string[]; onChange: (value: string[]) => void; available?: string[]; disabled?: boolean; legacyCount?: number | null; idPrefix: string };

export default function CrewSelector({ value, onChange, available, disabled = false, legacyCount, idPrefix }: Props) {
  const allowed = new Set(available ?? [...URBAN_CREWS, ...RURAL_CREWS]);
  const groups = [{ label: 'Área urbana', crews: URBAN_CREWS }, { label: 'Área rural', crews: RURAL_CREWS }];
  function toggle(crew: string, checked: boolean) { onChange(checked ? [...value, crew] : value.filter(item => item !== crew)); }
  return <div className="form-field crew-field">
    <div className="crew-heading"><Label>Cuadrillas</Label><span>{value.length} seleccionada{value.length === 1 ? '' : 's'}</span></div>
    {legacyCount && !value.length ? <p className="legacy-crews">Registro anterior: {legacyCount} cuadrillas sin identificar. Selecciona sus claves para actualizarlo.</p> : null}
    {groups.map(group => {
      const options = group.crews.filter(crew => allowed.has(crew));
      if (!options.length) return null;
      return <fieldset className="crew-group" key={group.label} disabled={disabled}><legend>{group.label}</legend><div className="crew-options">{options.map(crew => {
        const id = `${idPrefix}-${crew.toLowerCase()}`;
        return <label className="crew-option" htmlFor={id} key={crew}><Checkbox id={id} checked={value.includes(crew)} onCheckedChange={checked => toggle(crew, checked === true)}/><span>{crew}</span></label>;
      })}</div></fieldset>;
    })}
    {available && available.length === 0 ? <p className="legacy-crews">Primero edita el ramal y asígnale sus cuadrillas.</p> : null}
  </div>;
}
