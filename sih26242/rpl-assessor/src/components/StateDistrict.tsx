import { STATES, districtsFor } from '../data/geo';

export interface StateDistrictValue {
  state: string;
  district: string;
}

/** Two linked <select>s: choosing a state filters the district list. */
export function StateDistrictSelects({
  value,
  onChange,
  stateLabel = 'State / UT',
  districtLabel = 'District'
}: {
  value: StateDistrictValue;
  onChange: (next: StateDistrictValue) => void;
  stateLabel?: string;
  districtLabel?: string;
}) {
  const districts = districtsFor(value.state);

  return (
    <div className="grid cols-2">
      <label className="field">
        <span>{stateLabel}</span>
        <select
          value={value.state}
          onChange={(e) => onChange({ state: e.target.value, district: '' })}
        >
          <option value="">Select a state / UT…</option>
          {STATES.map((s) => (
            <option key={s.state} value={s.state}>{s.state}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{districtLabel}</span>
        <select
          value={value.district}
          disabled={!value.state}
          onChange={(e) => onChange({ state: value.state, district: e.target.value })}
        >
          <option value="">{value.state ? 'Select a district…' : 'Choose a state first'}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
